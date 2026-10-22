import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { LOGO_PATH } from '../src/icons'
import { ogName, pages, TOOLS } from '../src/site'

// 1200×630 link previews: page heading on a plain card, one Chrome process per shot;
// each worker needs its own profile, parallel Chromes sharing one fail on the profile lock
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const TMP = resolve('node_modules/.export-og/html')
const OUT = resolve('public/og')

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const style = `
*{box-sizing:border-box}
body{margin:0;width:1200px;height:630px;overflow:hidden;background:#fff;color:#16201f;font:400 16px/1.4 system-ui,-apple-system,'Helvetica Neue',Arial,sans-serif}
.card{display:flex;flex-direction:column;height:100%;padding:72px 80px 64px;border-bottom:14px solid #0b7a75}
.brand{display:flex;align-items:center;gap:16px;font-weight:650;font-size:30px}
.brand svg{width:44px;height:44px;fill:#0b7a75}
.tag{margin-top:auto;font-size:24px;color:#5b6766}
h1{margin:16px 0 0;font-weight:700;font-size:68px;line-height:1.08;letter-spacing:-.02em;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.site{margin-top:32px;font-size:24px;color:#5b6766}`

const mark = `<svg viewBox="0 0 32 32"><path fill-rule="evenodd" d="${LOGO_PATH}"/></svg>`

const card = (lang: string, heading: string, tag: string) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>${style}</style></head>
<body><div class="card">
  <div class="brand">${mark}shanyraq</div>
  <div class="tag">${esc(tag)}</div>
  <h1>${esc(heading)}</h1>
  <div class="site">shanyraq.webmonolith.kz</div>
</div></body></html>`

const TAG = { ru: 'Инструменты для Казахстана', kk: 'Қазақстанға арналған құралдар' }

const run = promisify(execFile)
const shot = (name: string, worker: number) =>
  run(CHROME, [
    '--headless=new',
    `--user-data-dir=${TMP}/../profile-${worker}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--window-size=1200,630',
    `--screenshot=${OUT}/${name}.png`,
    `file://${TMP}/${name}.html`,
  ])

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(OUT, { recursive: true })

for (const page of pages) {
  const tool = TOOLS.find((t) => t.id === page.tool)
  const heading = page.kind === 'root' ? 'ИИН, IBAN, телефон, теңге, календарь' : page.h1
  const tag = tool ? `shanyraq/${tool.module.split('/')[1]}` : TAG[page.lang]
  await writeFile(`${TMP}/${ogName(page)}.html`, card(page.lang, heading, tag))
}

const queue = pages.map(ogName)
await Promise.all(
  Array.from({ length: 6 }, async (_, worker) => {
    for (let n = queue.shift(); n; n = queue.shift()) await shot(n, worker)
  }),
)
console.log(`public/og: ${pages.length} png`)
