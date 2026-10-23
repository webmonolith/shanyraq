import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CONTENT } from './content'
import { Logo, ToolIcon } from './icons'
import { hubPath, LANGS, type Lang, type Page, TOOLS, type ToolId, toolPath } from './site'
import { SOURCES } from './sources'

const UI = {
  ru: {
    langName: 'Русский',
    tools: 'Инструменты',
    tagline: 'Проверка и форматирование казахстанских данных прямо в браузере.',
    privacy: 'Введённые данные не покидают браузер: ИИН, суммы и тексты никуда не отправляются.',
    sources: 'Источники',
    code: 'В коде',
    other: 'Другие инструменты',
    facts: 'Каждый факт на сайте взят из официального источника, ссылки — внизу страниц.',
    studio: 'Сделано в Monolith Studio',
    source: 'Исходный код на GitHub',
    back: 'На главную',
    all: 'Все инструменты',
    onPage: 'На этой странице',
    tool: 'Инструмент',
    prev: 'Назад',
    next: 'Дальше',
    facts3: ['Данные не покидают браузер', 'Факты со ссылками на источники', 'Открытый код, MIT'],
    search: 'Найти инструмент',
    searchHint: 'ИИН, зарплата, НДС, латиница…',
    notFound: 'Ничего не найдено',
    close: 'Закрыть',
  },
  kk: {
    langName: 'Қазақша',
    tools: 'Құралдар',
    tagline: 'Қазақстандық деректерді тікелей браузерде тексеру және пішімдеу.',
    // TODO(verify): kk privacy wording after adding Google Analytics
    privacy:
      'Енгізілген деректер браузерден шықпайды: ЖСН, сомалар мен мәтіндер ешқайда жіберілмейді.',
    sources: 'Дереккөздер',
    code: 'Кодта',
    other: 'Басқа құралдар',
    facts: 'Сайттағы әр дерек ресми дереккөзден алынған, сілтемелер беттердің төменгі жағында.',
    studio: 'Monolith Studio жасаған',
    source: 'GitHub-тағы бастапқы код',
    back: 'Басты бетке',
    all: 'Барлық құралдар',
    onPage: 'Осы бетте',
    tool: 'Құрал',
    prev: 'Алдыңғы',
    next: 'Келесі',
    facts3: ['Деректер браузерден шықпайды', 'Ресми дереккөздерге сілтемелер', 'Ашық код, MIT'],
    // TODO(verify): kk search strings need native review
    search: 'Құралды іздеу',
    searchHint: 'ЖСН, жалақы, ҚҚС, латын…',
    notFound: 'Ештеңе табылмады',
    close: 'Жабу',
  },
}

const CODE: Record<string, string> = {
  iin: "import { parseTaxId } from 'shanyraq/taxid'\n\nparseTaxId('…') // { ok: true, value: { kind: 'iin', birthDate, gender, … } }",
  codes:
    "import { parsePhone } from 'shanyraq/phone'\n\nconst r = parsePhone('8 7182 32 45 67')\nif (r.ok) r.value.city?.ru // 'Павлодар', r.value.areaCode — '7182'",
  phone:
    "import { parsePhone, formatPhone } from 'shanyraq/phone'\n\nconst r = parsePhone('8 701 123 45 67')\nif (r.ok) formatPhone(r.value) // '+7 701 123 45 67'",
  iban: "import { parseIBAN, getBank } from 'shanyraq/iban'\n\ngetBank('722')?.bic // 'CASPKZKA'",
  plate:
    "import { parsePlate } from 'shanyraq/plate'\n\nparsePlate('237blm01') // { ok: true, value: { value: '237 BLM 01', type: 'individual', … } }",
  regions:
    "import { regionByKato, regionByPlateCode } from 'shanyraq/regions'\n\nregionByKato('751110000')?.id // 'almaty'\nregionByPlateCode('18')?.name.ru // 'область Абай'",
  batch:
    "import { parseTaxId } from 'shanyraq/taxid'\n\nconst bad = column.filter((v) => !parseTaxId(v).ok)",
  requisites:
    "import { parseIBAN } from 'shanyraq/iban'\nimport { parseTaxId } from 'shanyraq/taxid'\n\nparseIBAN('KZ86 125K ZT50 0410 0100').ok // true\nparseTaxId('180340021791').value?.kind // 'bin'",
  salary:
    "import { calculateSalary, grossFromNet } from 'shanyraq/tax'\n\ncalculateSalary(500000).value // { opv: 50000, vosms: 10000, ipn: 31025, net: 408975, … }\ngrossFromNet(408975).value?.gross // 500000",
  vat: "import { addVAT, extractVAT } from 'shanyraq/tax'\n\naddVAT(1000).value // { net: 1000, vat: 160, gross: 1160 }\nextractVAT(1160, { rate: 16 }).value?.vat // 160",
  mrp: "import { getTaxYear, mrpToTenge } from 'shanyraq/tax'\n\ngetTaxYear(2026) // { year: 2026, mrp: 4325, mzp: 85000 }\nmrpToTenge(10).value // 43250",
  leave:
    "import { sickPay, vacationPay } from 'shanyraq/leave'\n\nvacationPay(3600000, '2026-07-01', 24).value // { end: '2026-07-25', workingDays: 17, pay: 248780.55, … }\nsickPay(3600000, '2026-03-02', '2026-03-06').value?.pay // 73469.4",
  dismissal:
    "import { dismissalPay } from 'shanyraq/leave'\n\ndismissalPay(3600000, '2026-06-30', { unusedDays: 12, reason: 'reduction' }).value\n// { payBy: '2026-07-03', compensation: { workingDays: 8, pay: 118032.8, … }, severance: { months: 1, pay: 324590.2, … }, pay: 442623 }",
  maternity:
    "import { childcarePay, maternityPay } from 'shanyraq/family'\n\nmaternityPay(500000).value // { average: 450000, days: 126, amount: 1890000, opv: 189000, net: 1701000, … }\nchildcarePay(500000).value // { byIncome: 180000, min: 27680, max: 238000, amount: 180000, net: 162000, … }",
  alimony:
    "import { alimony, alimonyPenalty } from 'shanyraq/alimony'\n\nalimony(500000, { children: 2, gross: true }).value // { base: 408975, percent: 33.33, amount: 136325, kept: 272650, … }\nalimonyPenalty(100000, '2026-01-31', '2026-03-02').value // { days: 30, penalty: 3000 }",
  procedure:
    "import { procedureTerm } from 'shanyraq/procedure'\n\nprocedureTerm('2026-01-31', 'appeal').value // { start: '2026-02-01', due: '2026-02-28', end: '2026-03-02', moved: true }\nprocedureTerm('2026-03-18', { workingDays: 10 }).value?.end // '2026-04-06'",
  claim:
    "import { baseRate, claimDuty, claimPenalty } from 'shanyraq/claim'\n\nbaseRate('2026-10-01') // { rate: 16.25, since: '2026-09-07', stale: false }\nclaimPenalty(1000000, '2026-01-31', '2026-10-01').value // { penalty: 108184.93, total: 1108184.93, … }\nclaimDuty(1108184.93).value?.duty // 11081.85",
  simplified:
    "import { simplifiedTax } from 'shanyraq/tax'\n\nsimplifiedTax(3000000).value // { ipn: 120000, monthly: { opv: 8500, so: 4250, vosms: 5950 }, total: 232200, … }\nsimplifiedTax(3000000, { rate: 3 }).value?.ipn // 90000",
  fees: "import { mrpToTenge } from 'shanyraq/tax'\n\nmrpToTenge(8).value // 34600 — паспорт, 36 страниц\nmrpToTenge(10 / 2).value // 21625 — штраф 10 МРП при оплате за 7 суток",
  deadlines:
    "import { taxDeadlines } from 'shanyraq/deadlines'\n\ntaxDeadlines(2026, { regime: 'simplified', tags: ['ip'] }).value\n// [{ id: 'socialSelf', date: '2026-01-26', … }, { id: 'f910', form: '910.00', due: '2026-02-15', date: '2026-02-16', moved: true, … }, …]",
  loan: "import { loanSchedule } from 'shanyraq/loan'\n\nloanSchedule(1000000, 20, 12).value // { monthly: 92634.51, overpayment: 111614.09, apr: 21.94, … }\nloanSchedule(1000000, 20, 12, { method: 'differentiated', prepayments: [{ month: 3, amount: 300000 }] })",
  mortgage:
    "import { gesvLimit, loanSchedule } from 'shanyraq/loan'\n\nloanSchedule(20000000, 7, 300, { start: '2026-10-23' }).value // { monthly: 141355.84, apr: 7.22, … }\ngesvLimit('mortgage', '2027-01-01', 0.7).value // 20",
  money:
    "import { moneyToWords } from 'shanyraq/money'\n\nmoneyToWords(1234.5, { lang: 'kk' }) // { ok: true, value: 'Бір мың екі жүз отыз төрт теңге 50 тиын' }",
  calendar:
    "import { countWorkingDays, getDaysOff } from 'shanyraq/calendar'\n\ncountWorkingDays('2026-03-01', '2026-03-31') // { ok: true, value: 18 }",
  date: "import { formatDate } from 'shanyraq/date'\n\nformatDate('2026-10-22', { lang: 'kk' }) // { ok: true, value: '2026 жылғы 22 қазан' }",
  translit:
    "import { toLatin } from 'shanyraq/translit'\n\ntoLatin('Қазақстан Республикасы') // 'Qazaqstan Respublikasy'",
  faker:
    "import { createFaker } from 'shanyraq/faker'\n\nconst fake = createFaker(42)\nfake.iin({ gender: 'female' })",
}

const YEAR = new Date().getFullYear()
const REPO = 'https://github.com/webmonolith/shanyraq'

// TODO(verify): kk group names need native review
const GROUPS: { title: Record<Lang, string>; tools: ToolId[] }[] = [
  {
    title: { ru: 'Проверка данных', kk: 'Деректерді тексеру' },
    tools: ['iin', 'phone', 'codes', 'iban', 'plate', 'regions', 'batch', 'requisites'],
  },
  {
    title: { ru: 'Зарплата, налоги, кредиты', kk: 'Жалақы, салықтар, несиелер' },
    tools: [
      'salary',
      'leave',
      'dismissal',
      'maternity',
      'alimony',
      'simplified',
      'deadlines',
      'vat',
      'mrp',
      'fees',
      'loan',
      'mortgage',
    ],
  },
  // TODO(verify): kk group name
  {
    title: { ru: 'Суд и право', kk: 'Сот және құқық' },
    tools: ['procedure', 'claim'],
  },
  {
    title: { ru: 'Тексты и даты', kk: 'Мәтін мен күндер' },
    tools: ['money', 'date', 'translit', 'calendar'],
  },
  { title: { ru: 'Разработчикам', kk: 'Әзірлеушілерге' }, tools: ['faker'] },
]
const ORDER = GROUPS.flatMap((g) => g.tools)
const BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<
  ToolId,
  (typeof TOOLS)[number]
>
const toolById = (id: ToolId) => BY_ID[id]

const Brand = ({ href }: { href: string }) => (
  <a className="brand" href={href}>
    <Logo />
    shanyraq
  </a>
)

// The button shows only with JS (`.js` on <html>); entry-client.ts wires it to the dialog.
const Search = ({ page }: { page: Page }) => {
  const t = UI[page.lang]
  return (
    <>
      <button type="button" className="search js-only" data-search>
        <SearchIcon />
        <span className="search__label">{t.search}</span>
        <kbd className="kbd-mac">⌘K</kbd>
        <kbd className="kbd-pc">Ctrl K</kbd>
      </button>
      <dialog className="finder" aria-label={t.search}>
        <div className="finder__bar">
          <SearchIcon />
          <input
            type="search"
            placeholder={t.searchHint}
            aria-label={t.search}
            autoComplete="off"
            spellCheck={false}
          />
          <kbd>Esc</kbd>
          <button type="button" className="finder__close" data-close aria-label={t.close}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>
        <ul>
          {ORDER.map((id) => {
            const text = BY_ID[id].text[page.lang]
            return (
              <li key={id}>
                <a
                  href={toolPath(page.lang, id)}
                  data-keys={[text.name, text.h1, text.description, BY_ID[id].module].join(' ')}
                >
                  <ToolIcon id={id} size="sm" />
                  <span className="finder__text">
                    <b>{text.name}</b>
                    <small>{text.description}</small>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
        <p className="finder__empty" hidden>
          {t.notFound}
        </p>
      </dialog>
    </>
  )
}

const SearchIcon = () => (
  <svg className="search__icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <circle cx="7" cy="7" r="5" />
    <path d="M11 11l3.5 3.5" />
  </svg>
)

const Header = ({ page }: { page: Page }) => {
  const t = UI[page.lang]
  return (
    <header className={page.kind === 'hub' || page.kind === 'tool' ? 'top top--docs' : 'top'}>
      <div className="top__in">
        <Brand href={page.kind === 'root' ? '/' : hubPath(page.lang)} />
        {page.kind !== 'root' && <Search page={page} />}
        <div className="top__right">
          {page.kind !== 'root' && (
            <details className="menu">
              <summary aria-label={t.tools}>
                <svg
                  className="menu__icon"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" />
                  <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5" />
                  <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5" />
                  <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5" />
                </svg>
                <span>{t.tools}</span>
              </summary>
              <ul>
                {TOOLS.map((tool) => (
                  <li key={tool.id}>
                    <a
                      href={toolPath(page.lang, tool.id)}
                      aria-current={tool.id === page.tool ? 'page' : undefined}
                    >
                      <ToolIcon id={tool.id} size="sm" />
                      {tool.text[page.lang].name}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
          <a className="top__gh" href={REPO} rel="noopener" aria-label={t.source} title={t.source}>
            <GitHubMark />
          </a>
          {page.alternates && (
            <nav className="langs" aria-label="Language">
              {LANGS.map((l) =>
                l === page.lang ? (
                  <span key={l} aria-current="page">
                    {l.toUpperCase()}
                  </span>
                ) : (
                  <a
                    key={l}
                    href={page.alternates?.[l]}
                    hrefLang={l}
                    lang={l}
                    title={UI[l].langName}
                  >
                    {l.toUpperCase()}
                  </a>
                ),
              )}
            </nav>
          )}
        </div>
      </div>
    </header>
  )
}

const GitHubMark = () => (
  <svg className="gh" viewBox="0 0 16 16" width="15" height="15" aria-hidden="true">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
)

// The single developer tool shares a column with the text tools so the footer stays three columns wide.
const FOOT_COLUMNS = [GROUPS.slice(0, 1), GROUPS.slice(1, 2), GROUPS.slice(2)]

const Footer = ({ lang }: { lang: Lang }) => {
  const t = UI[lang]
  return (
    <footer className="foot">
      <div className="foot__in">
        <div className="foot__about">
          <Brand href={hubPath(lang)} />
          <p className="foot__tagline">{t.tagline}</p>
          <p>{t.facts}</p>
          <p className="foot__privacy">{t.privacy}</p>
          <a className="foot__repo" href={REPO} rel="noopener">
            <GitHubMark />
            {t.source}
          </a>
        </div>
        <nav className="foot__nav" aria-label={t.tools}>
          {FOOT_COLUMNS.map((column, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static columns
            <div key={i}>
              {column.map((g) => (
                <div className="foot__group" key={g.title.ru}>
                  <h2>{g.title[lang]}</h2>
                  <ul>
                    {g.tools.map((id) => (
                      <li key={id}>
                        <a href={toolPath(lang, id)}>{BY_ID[id].text[lang].name}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="foot__bottom">
        <span>© {YEAR} shanyraq · MIT</span>
        <a href="https://webmonolith.kz/">{t.studio}</a>
      </div>
    </footer>
  )
}

const Shell = ({ page, children }: { page: Page; children: ReactNode }) => (
  <>
    <Header page={page} />
    <main>{children}</main>
    <Footer lang={page.lang} />
  </>
)

const Side = ({ page }: { page: Page }) => {
  const t = UI[page.lang]
  return (
    <aside className="side" aria-label={t.tools}>
      <a
        className="side__hub"
        href={hubPath(page.lang)}
        aria-current={page.kind === 'hub' ? 'page' : undefined}
      >
        <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" />
          <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5" />
          <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5" />
          <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5" />
        </svg>
        {t.all}
      </a>
      {GROUPS.map((g) => (
        <div key={g.title.ru} className="side__group">
          <p className="side__label">{g.title[page.lang]}</p>
          <ul>
            {g.tools.map((id) => (
              <li key={id}>
                <a
                  href={toolPath(page.lang, id)}
                  aria-current={id === page.tool ? 'page' : undefined}
                >
                  <ToolIcon id={id} size="sm" />
                  {toolById(id).text[page.lang].name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="side__note">{t.privacy}</p>
    </aside>
  )
}

type TocItem = { id: string; html: string }

const Docs = ({ page, toc, children }: { page: Page; toc?: TocItem[]; children: ReactNode }) => {
  const t = UI[page.lang]
  return (
    <>
      <Header page={page} />
      <div className="docs">
        <Side page={page} />
        <main className="docs__main">{children}</main>
        {toc && toc.length > 1 && (
          <nav className="toc" aria-label={t.onPage}>
            <p>{t.onPage}</p>
            <ol>
              {toc.map((x) => (
                <li key={x.id}>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: heading markup comes from our own server render */}
                  <a href={`#${x.id}`} dangerouslySetInnerHTML={{ __html: x.html }} />
                </li>
              ))}
            </ol>
          </nav>
        )}
      </div>
      <Footer lang={page.lang} />
    </>
  )
}

// h2 ids and the outline are taken from the rendered article, so content.tsx stays plain markup
const withIds = (html: string, toc: TocItem[]) =>
  html.replace(/<h2>(.*?)<\/h2>/g, (_, inner: string) => {
    const id = `s${toc.length}`
    toc.push({ id, html: inner })
    return `<h2 id="${id}">${inner}</h2>`
  })

const ToolList = ({ lang, only }: { lang: Lang; only?: ToolId[] }) => (
  <ul className="tools">
    {TOOLS.filter((tool) => !only || only.includes(tool.id)).map((tool) => (
      <li key={tool.id}>
        <a href={toolPath(lang, tool.id)}>
          <ToolIcon id={tool.id} />
          <b>{tool.text[lang].name}</b>
          <span>{tool.text[lang].description}</span>
        </a>
      </li>
    ))}
  </ul>
)

const host = (url: string): string => new URL(url).hostname.replace(/^www\./, '')

export const PageView = ({ page, widget }: { page: Page; widget: string }) => {
  const t = UI[page.lang]
  if (page.kind === 'root')
    return (
      <Shell page={page}>
        <h1>shanyraq</h1>
        <div className="split">
          {LANGS.map((l) => (
            <section key={l} lang={l}>
              <h2>
                <a href={hubPath(l)}>{UI[l].langName}</a>
              </h2>
              <ToolList lang={l} />
            </section>
          ))}
        </div>
      </Shell>
    )
  if (page.kind === 'hub')
    return (
      <Docs page={page}>
        <section className="hero">
          <h1>{page.h1}</h1>
          <p className="lead">{page.description}</p>
          <p className="hero__facts">{t.facts3.join(' · ')}</p>
        </section>
        {GROUPS.map((g) => (
          <section key={g.title.ru} className="hub-group">
            <h2>{g.title[page.lang]}</h2>
            <ToolList lang={page.lang} only={g.tools} />
          </section>
        ))}
      </Docs>
    )
  if (page.kind === 'notFound' || !page.tool)
    return (
      <Shell page={page}>
        <h1>{page.h1}</h1>
        <p>
          <a href={hubPath(page.lang)}>{t.back}</a>
        </p>
      </Shell>
    )
  const id = page.tool
  const Content = CONTENT[id]
  const sources = SOURCES[id]
  const tool = toolById(id)
  const at = ORDER.indexOf(id)
  const prev = ORDER[at - 1]
  const next = ORDER[at + 1]
  const toc: TocItem[] = [{ id: 'tool', html: t.tool }]
  const article = withIds(
    renderToStaticMarkup(
      <>
        <Content lang={page.lang} />
        <h2>{t.code}</h2>
        <pre>
          <code>{CODE[id]}</code>
        </pre>
        {sources.length > 0 && (
          <>
            <h2>{t.sources}</h2>
            <ol className="sources">
              {sources.map((s) => (
                <li key={s.url + s.title}>
                  <a href={s.url} rel="noopener">
                    {s.title}
                  </a>
                  <span>{host(s.url)}</span>
                </li>
              ))}
            </ol>
          </>
        )}
      </>,
    ),
    toc,
  )
  return (
    <Docs page={page} toc={toc}>
      <div className="kicker">
        <ToolIcon id={id} size="lg" />
        <code>{tool.module}</code>
      </div>
      <h1>{page.h1}</h1>
      <p className="lead">{page.description}</p>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: widget markup is rendered separately so it hydrates on its own */}
      <div id="tool" className="tool" data-tool={id} dangerouslySetInnerHTML={{ __html: widget }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: server-rendered article with heading ids added */}
      <article className="content" dangerouslySetInnerHTML={{ __html: article }} />
      <nav className="pager" aria-label={t.other}>
        {prev && (
          <a href={toolPath(page.lang, prev)} rel="prev" className="pager__prev">
            <small>{t.prev}</small>
            <b>{toolById(prev).text[page.lang].name}</b>
          </a>
        )}
        {next && (
          <a href={toolPath(page.lang, next)} rel="next" className="pager__next">
            <small>{t.next}</small>
            <b>{toolById(next).text[page.lang].name}</b>
          </a>
        )}
      </nav>
    </Docs>
  )
}
