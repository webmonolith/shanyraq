/// <reference types="node" />
import process from 'node:process'
import { createInterface } from 'node:readline'
import { parseArgs } from 'node:util'
import { version } from '../package.json'
import { parseBIN } from './bin/bin'
import { addWorkingDays, countWorkingDays, getDaysOff } from './calendar/calendar'
import type { CalendarError, ErrorCodes } from './core/errors'
import type { Result } from './core/result'
import { createFaker } from './faker/faker'
import { getMessage, type Lang } from './i18n'
import { formatIBAN, type IBANInfo, parseIBAN } from './iban/iban'
import { parseIIN } from './iin/iin'
import { moneyToWords } from './money/money'
import { formatPhone, parsePhone } from './phone/phone'
import type { PhoneInfo } from './phone/types'
import { type PlateInfo, parsePlate } from './plate/plate'
import { getRegion } from './regions/regions'
import { parseTaxId } from './taxid/taxid'

const HELP = `shanyraq ${version} — Kazakhstan identifiers, phones, IBANs, plates, amounts and working days

Usage
  shanyraq iin <value...>      validate an IIN, decode birth date and gender
  shanyraq bin <value...>      validate a BIN, decode entity and division type
  shanyraq taxid <value...>    tell an IIN from a BIN and validate it
  shanyraq phone <value...>    validate a +7 number, show operator or city
  shanyraq iban <value...>     validate a KZ IBAN, show the bank
  shanyraq plate <value...>    validate a licence plate, show series and region
  shanyraq words <amount...>   amount in words (ru, kk)
  shanyraq workdays <year>             days off of a year
  shanyraq workdays <from> <to>        working days between two dates, inclusive
  shanyraq workdays <date> --add <n>   date n working days later (negative: earlier)
  shanyraq fake <kind>         test data: iin, bin, taxid, phone, landline, iban, plate, amount

  Values are read from stdin, one per line, when none are given.

Options
  --strict          strict validation (no separators, structure required)
  --json            one JSON object per value
  --lang <ru|kk|en> message language (default from $LANG)
  --add <n>         workdays: move n working days
  --tiyn <digits|words>, --tenge, --no-one   words: tiyn style, «тенге» spelling, kk «жүз»/«мың» without «бір»
  --count <n>, --seed <n>                     fake: how many values, PRNG seed
  --no-color        disable colors (NO_COLOR is respected too)
  -h, --help        -v, --version

Exit code 1 when any value is invalid, 2 on usage errors.`

type Fields = [label: string, value: string | number | undefined][]

const out = (line: string) => process.stdout.write(`${line}\n`)

const usage = (message: string): never => {
  process.stderr.write(`shanyraq: ${message}\nRun "shanyraq --help" for usage.\n`)
  process.exit(2)
}

const detectLang = (): Lang => {
  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || ''
  return env.startsWith('kk') ? 'kk' : env.startsWith('ru') ? 'ru' : 'en'
}

const parsed = (() => {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        strict: { type: 'boolean' },
        json: { type: 'boolean' },
        lang: { type: 'string' },
        tiyn: { type: 'string' },
        tenge: { type: 'boolean' },
        'no-one': { type: 'boolean' },
        count: { type: 'string' },
        add: { type: 'string' },
        seed: { type: 'string' },
        'no-color': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        version: { type: 'boolean', short: 'v' },
      },
    })
  } catch (e) {
    return usage((e as Error).message)
  }
})()

const { values: opts, positionals } = parsed
const [command, ...args] = positionals

if (opts.version) {
  out(version)
  process.exit(0)
}
if (opts.help || !command) {
  out(HELP)
  process.exit(opts.help ? 0 : 2)
}

const lang = (opts.lang ?? detectLang()) as Lang
if (!['ru', 'kk', 'en'].includes(lang)) usage(`unknown language "${lang}"`)

const env = process.env
const color = !opts['no-color'] && !env.NO_COLOR && (!!env.FORCE_COLOR || !!process.stdout.isTTY)
const paint = (code: number) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s)
const green = paint(32)
const red = paint(31)
const dim = paint(2)

const readValues = async (): Promise<string[]> => {
  if (args.length || process.stdin.isTTY) return args
  const lines: string[] = []
  for await (const line of createInterface({ input: process.stdin }))
    if (line.trim()) lines.push(line.trim())
  return lines
}

const show = (fields: Fields) =>
  fields
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (k ? `${dim(k)} ${v}` : String(v)))
    .join(dim(' · '))

const report = async <M extends keyof ErrorCodes, T>(
  module: M,
  parseValue: (input: string) => Result<T, ErrorCodes[M]>,
  fields: (value: T) => Fields,
): Promise<boolean> => {
  const inputs = await readValues()
  if (!inputs.length) usage(`no values given for "${command}"`)
  let allValid = true
  for (const input of inputs) {
    const r = parseValue(input)
    if (!r.ok) allValid = false
    if (opts.json) {
      const message = r.ok ? undefined : getMessage(lang, module, r.error)
      out(JSON.stringify(r.ok ? { input, ...r } : { input, ...r, message }))
    } else if (r.ok) out(`${green('✓')} ${input}  ${show(fields(r.value))}`)
    else out(`${red('✗')} ${input}  ${red(getMessage(lang, module, r.error))}`)
  }
  return allValid
}

const strict = { strict: !!opts.strict }

const iinFields = (v: { birthDate?: string; gender?: string; century?: number }): Fields =>
  v.birthDate
    ? [
        ['born', v.birthDate],
        ['gender', v.gender],
        ['century', v.century],
      ]
    : [['structure', 'not decodable (allowed since 2013)']]

const binFields = (v: {
  entityType: string
  divisionType?: string
  registered?: { yy: number; month: number }
  serial: string
}): Fields => [
  ['entity', v.entityType],
  ['division', v.divisionType],
  [
    'registered',
    v.registered &&
      `${String(v.registered.month).padStart(2, '0')}/${String(v.registered.yy).padStart(2, '0')} (MM/YY)`,
  ],
  ['serial', v.serial],
]

const phoneFields = (p: PhoneInfo): Fields => [
  ['', formatPhone(p)],
  ['country', p.country],
  ['type', p.type],
  ['operator', p.originalOperator],
  ['city', p.city?.[lang]],
]

const ibanFields = (v: IBANInfo): Fields => [
  ['', formatIBAN(v)],
  ['bank', v.bank?.name[lang] ?? `unknown code ${v.bankCode}`],
  ['bic', v.bank?.bic],
  ['', v.bank && !v.bank.active ? 'inactive' : undefined],
]

const plateFields = (v: PlateInfo): Fields => [
  ['', v.value],
  ['type', v.type],
  ['region', v.regionId && `${v.regionCode} ${getRegion(v.regionId)?.name[lang]}`],
]

const workdays = (): boolean => {
  const [a, b] = args
  if (!a || args.length > 2) return usage('workdays: give a year, two dates, or a date with --add')
  const options = strict
  const fail = (code: CalendarError) => {
    if (opts.json)
      out(JSON.stringify({ ok: false, error: code, message: getMessage(lang, 'calendar', code) }))
    else out(`${red('✗')} ${red(getMessage(lang, 'calendar', code))}`)
    return false
  }
  if (opts.add !== undefined) {
    if (b) usage('workdays: --add takes a single date')
    const n = Number(opts.add)
    if (!Number.isInteger(n)) usage('--add must be an integer')
    const r = addWorkingDays(a, n, options)
    if (!r.ok) return fail(r.error)
    out(opts.json ? JSON.stringify(r) : r.value)
    return true
  }
  if (b) {
    const r = countWorkingDays(a, b, options)
    if (!r.ok) return fail(r.error)
    out(opts.json ? JSON.stringify(r) : String(r.value))
    return true
  }
  if (!/^\d{4}$/.test(a)) usage('workdays: expected a 4-digit year')
  const r = getDaysOff(Number(a), options)
  if (!r.ok) return fail(r.error)
  for (const d of r.value) {
    if (opts.json) out(JSON.stringify(d))
    else
      out(
        `${d.date}  ${d.kind.padEnd(8)}  ${d.holiday ? d.holiday.name[lang] : `${dim('from')} ${d.from}`}`,
      )
  }
  return true
}

const fake = (): boolean => {
  const kind = args[0]
  const count = Number(opts.count ?? 1)
  if (!Number.isInteger(count) || count < 1) usage('--count must be a positive integer')
  const seed = opts.seed === undefined ? undefined : Number(opts.seed)
  if (seed !== undefined && !Number.isInteger(seed)) usage('--seed must be an integer')
  const f = createFaker(seed)
  const generators: Record<string, () => string | number> = {
    iin: () => f.iin(),
    bin: () => f.bin(),
    taxid: () => f.taxId(),
    phone: () => f.phone(),
    landline: () => f.phone({ type: 'landline' }),
    iban: () => f.iban(),
    plate: () => f.plate(),
    amount: () => f.amount(),
  }
  const generate = kind ? generators[kind] : undefined
  if (!generate) return usage(`fake: unknown kind "${kind ?? ''}"`)
  for (let i = 0; i < count; i++) {
    const value = generate()
    out(opts.json ? JSON.stringify(value) : String(value))
  }
  return true
}

const words = async (): Promise<boolean> => {
  if (opts.tiyn && opts.tiyn !== 'digits' && opts.tiyn !== 'words')
    usage('--tiyn must be digits or words')
  const options = {
    lang: lang === 'kk' ? ('kk' as const) : ('ru' as const),
    tiyn: opts.tiyn === 'words' ? ('words' as const) : ('digits' as const),
    currency: opts.tenge ? ('тенге' as const) : ('теңге' as const),
    explicitOne: !opts['no-one'],
  }
  return report(
    'money',
    (s) => moneyToWords(s, options),
    (text) => [['', text]],
  )
}

const commands: Record<string, () => boolean | Promise<boolean>> = {
  iin: () => report('iin', (s) => parseIIN(s, strict), iinFields),
  bin: () => report('bin', (s) => parseBIN(s, strict), binFields),
  taxid: () =>
    report(
      'taxid',
      (s) => parseTaxId(s, strict),
      (v) => [['kind', v.kind], ...(v.kind === 'iin' ? iinFields(v) : binFields(v))],
    ),
  phone: () => report('phone', (s) => parsePhone(s, strict), phoneFields),
  iban: () => report('iban', (s) => parseIBAN(s, strict), ibanFields),
  plate: () => report('plate', (s) => parsePlate(s, strict), plateFields),
  workdays,
  words,
  fake,
}

const run = commands[command]
if (!run) usage(`unknown command "${command}"`)
else process.exitCode = (await run()) ? 0 : 1
