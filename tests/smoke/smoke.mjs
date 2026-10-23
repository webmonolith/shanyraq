// Runs the built ESM output on any Node >= 18 without dev dependencies.
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { getMessage, isValidIIN, messages, moneyToWords, parsePhone } from 'shanyraq'
import { alimony } from 'shanyraq/alimony'
import { isValidBIN } from 'shanyraq/bin'
import { countWorkingDays, isDayOff } from 'shanyraq/calendar'
import { claimDuty, claimPenalty } from 'shanyraq/claim'
import { formatDate } from 'shanyraq/date'
import { taxDeadlines } from 'shanyraq/deadlines'
import { createFaker } from 'shanyraq/faker'
import { childcarePay, maternityPay } from 'shanyraq/family'
import { ru } from 'shanyraq/i18n'
import { formatIBAN, getBank, parseIBAN } from 'shanyraq/iban'
import { parseIIN } from 'shanyraq/iin'
import { dismissalPay, sickPay, vacationPay } from 'shanyraq/leave'
import { gesvLimit, loanSchedule } from 'shanyraq/loan'
import { parseAmount } from 'shanyraq/money'
import { formatPhone } from 'shanyraq/phone'
import { parsePlate } from 'shanyraq/plate'
import { procedureTerm } from 'shanyraq/procedure'
import { regionByPlateCode } from 'shanyraq/regions'
import { addVAT, calculateSalary, simplifiedTax } from 'shanyraq/tax'
import { parseTaxId } from 'shanyraq/taxid'
import { toLatin } from 'shanyraq/translit'

assert.equal(getMessage('ru', 'iin', 'checksum'), 'Неверная контрольная цифра ИИН')
assert.equal(messages.ru, ru)
assert.equal(messages.kk.iin.length, 'ЖСН 12 цифрдан тұруы керек')
assert.equal(isValidIIN('900101300126'), true)
assert.equal(parseIIN('900101300126').value.birthDate, '1990-01-01')
assert.equal(isValidBIN('180340021791'), true)
assert.equal(parseTaxId('180340021791').value.kind, 'bin')
assert.equal(formatPhone(parsePhone('87071234567').value, 'national'), '8 (707) 123-45-67')
assert.equal(moneyToWords(1000, { lang: 'kk' }).value, 'Бір мың теңге 00 тиын')
assert.deepEqual(parseAmount('1 234,5').value, { tenge: 1234, tiyn: 50 })
assert.equal(isValidIIN(createFaker(1).iin(), { strict: true }), true)
assert.equal(formatIBAN(parseIBAN('kz86125kzt5004100100').value), 'KZ86 125K ZT50 0410 0100')
assert.equal(getBank('722').bic, 'CASPKZKA')
assert.equal(parseIBAN(createFaker(1).iban(), { strict: true }).ok, true)
assert.equal(parsePlate('237blm01').value.regionId, 'astana')
assert.equal(regionByPlateCode('17').id, 'shymkent')
assert.equal(isDayOff('2026-03-24'), true)
assert.equal(countWorkingDays('2026-03-01', '2026-03-31').value, 18)
assert.equal(formatDate('2026-10-22', { lang: 'kk' }).value, '2026 жылғы 22 қазан')
assert.equal(toLatin('Қазақстан'), 'Qazaqstan')
assert.equal(calculateSalary(500000).value.net, 408975)
assert.equal(addVAT(1000).value.gross, 1160)
assert.equal(simplifiedTax(3000000).value.total, 232200)
assert.equal(vacationPay(3600000, '2026-07-01').value.pay, 248780.55)
assert.equal(sickPay(3600000, '2026-03-02', '2026-03-06').value.pay, 73469.4)
assert.equal(procedureTerm('2026-01-31', 'appeal').value.end, '2026-03-02')
assert.equal(alimony(500000, { children: 2, gross: true }).value.amount, 136325)
assert.equal(claimPenalty(1000000, '2026-01-31', '2026-10-01').value.penalty, 108184.93)
assert.equal(claimDuty(1108184.93).value.duty, 11081.85)
assert.equal(maternityPay(500000).value.amount, 1890000)
assert.equal(childcarePay(500000).value.net, 162000)
assert.equal(
  dismissalPay(3600000, '2026-06-30', { unusedDays: 12, reason: 'reduction' }).value.pay,
  442623,
)
assert.equal(loanSchedule(1000000, 20, 12).value.apr, 21.94)
assert.equal(taxDeadlines(2026, { regime: 'simplified', tags: [] }).value[0].date, '2026-02-16')
assert.equal(gesvLimit('mortgage', '2027-01-01', 0.7).value, 20)

const cli = new URL('../../dist/cli.js', import.meta.url).pathname
const run = (...args) =>
  spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1', LANG: 'en_US.UTF-8' },
  })
assert.deepEqual(JSON.parse(run('iin', '900101300126', '--json').stdout), {
  input: '900101300126',
  ok: true,
  value: { value: '900101300126', birthDate: '1990-01-01', gender: 'male', century: 20 },
})
const bad = run('iin', '900101300123')
assert.equal(bad.status, 1)
assert.match(bad.stdout, /^✗ 900101300123 {2}Invalid IIN check digit\n$/)
assert.equal(run('nope').status, 2)
assert.equal(run('fake', 'bin', '--seed', '5').stdout, run('fake', 'bin', '--seed', '5').stdout)
assert.equal(run('words', '21', '--lang', 'ru').stdout, '✓ 21  Двадцать один теңге 00 тиынов\n')
assert.equal(run('workdays', '2026-12-15', '--add', '1').stdout, '2026-12-17\n')
assert.equal(run('workdays', '2026-03-01', '2026-03-31').stdout, '18\n')
assert.equal(run('workdays', '2028', '--strict').status, 1)
assert.match(run('iban', 'KZ86125KZT5004100100').stdout, /bic NBRKKZKX/)
assert.match(run('plate', '237blm01').stdout, /237 BLM 01 · type individual · region 01 Astana/)
assert.match(
  execFileSync(process.execPath, [cli, 'phone'], {
    input: '+77071234567\n',
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  }),
  /operator tele2-altel/,
)
console.log(`esm ok (node ${process.version})`)
