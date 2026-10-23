import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { LOGO_HORN, logoSvg } from '../src/icons'
import { ogName, pages, TOOLS } from '../src/site'

// 1200×630 link previews (page heading on a plain card) and PWA icons, one Chrome process per shot;
// each worker needs its own profile, parallel Chromes sharing one fail on the profile lock
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const TMP = resolve('node_modules/.export-og/html')
const OUT = resolve('public')

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

const mark = logoSvg()

const card = (lang: string, heading: string, tag: string) => `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><style>${style}</style></head>
<body><div class="card">
  <div class="brand">${mark}shanyraq</div>
  <div class="tag">${esc(tag)}</div>
  <h1>${esc(heading)}</h1>
  <div class="site">shanyraq.webmonolith.kz</div>
</div></body></html>`

// Full-bleed square: the teal page is the tile, the horn stays inside the 80% safe zone of maskable icons.
const icon = (size: number) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#0b7a75;display:grid;place-items:center}
svg{width:84%;height:84%}
</style></head><body><svg viewBox="2 2 28 28"><path d="${LOGO_HORN}" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></body></html>`

const ICONS = { 'icons/180': 180, 'icons/192': 192, 'icons/512': 512 }

const TAG = { ru: 'Инструменты для Казахстана', kk: 'Қазақстанға арналған құралдар' }

const run = promisify(execFile)
const shot = ([name, w, h]: Shot, worker: number) =>
  run(CHROME, [
    '--headless=new',
    `--user-data-dir=${TMP}/../profile-${worker}`,
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${w},${h}`,
    `--screenshot=${OUT}/${name}.png`,
    `file://${TMP}/${name.replace('/', '-')}.html`,
  ])

type Shot = [name: string, width: number, height: number]

await rm(TMP, { recursive: true, force: true })
await mkdir(TMP, { recursive: true })
await mkdir(`${OUT}/og`, { recursive: true })
await mkdir(`${OUT}/icons`, { recursive: true })

for (const page of pages) {
  const tool = TOOLS.find((t) => t.id === page.tool)
  const heading = page.h1
  const tag = tool ? tool.module : TAG[page.lang]
  await writeFile(`${TMP}/og-${ogName(page)}.html`, card(page.lang, heading, tag))
}
for (const [name, size] of Object.entries(ICONS))
  await writeFile(`${TMP}/${name.replace('/', '-')}.html`, icon(size))

const queue: Shot[] = [
  ...pages.map((p): Shot => [`og/${ogName(p)}`, 1200, 630]),
  ...Object.entries(ICONS).map(([name, size]): Shot => [name, size, size]),
]
await Promise.all(
  Array.from({ length: 6 }, async (_, worker) => {
    for (let s = queue.shift(); s; s = queue.shift()) await shot(s, worker)
  }),
)
console.log(`public/og: ${pages.length} png, public/icons: ${Object.keys(ICONS).length} png`)
