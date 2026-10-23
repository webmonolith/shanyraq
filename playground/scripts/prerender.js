import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const { render, pages, SITE } = await import('../dist-server/entry-server.js')
const dist = new URL('../dist/', import.meta.url)
const template = await readFile(new URL('index.html', dist), 'utf8')
const hasOg = (name) => existsSync(new URL(`../public/og/${name}.png`, import.meta.url))

const missingOg = []
for (const { path } of pages) {
  const { page, html } = render(path, template, (name) => hasOg(name) || !missingOg.push(path))
  const dir = new URL(`.${page.path}`, dist)
  await mkdir(dir, { recursive: true })
  await writeFile(new URL('index.html', dir), html)
}
await writeFile(new URL('404.html', dist), render('/404/', template, () => false).html)

const today = new Date().toISOString().slice(0, 10)
const entry = (page) => {
  const links = page.alternates
    ? Object.entries(page.alternates)
        .map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE}${p}"/>`)
        .join('')
    : ''
  return `  <url><loc>${SITE}${page.path}</loc><lastmod>${today}</lastmod>${links}</url>`
}
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages
    .filter((p) => p.kind !== 'root')
    .map(entry)
    .join('\n')}\n</urlset>\n`,
)
await writeFile(
  new URL('robots.txt', dist),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
)

// Offline: precache every page and asset except link-preview images, crawler files and the worker itself.
const SKIP = /^(og\/|sitemap\.xml$|robots\.txt$|sw\.js$|\.htaccess$)/
const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter((f) => f.isFile())
  .map((f) => relative(fileURLToPath(dist), join(f.parentPath, f.name)))
  .filter((f) => !SKIP.test(f))
  .sort()
const hash = createHash('sha256')
for (const f of files) hash.update(f).update(await readFile(new URL(f, dist)))
const urls = files.map((f) => `/${f.replace(/(^|\/)index\.html$/, '$1')}`)
await writeFile(
  new URL('sw.js', dist),
  `const CACHE = 'shanyraq-${hash.digest('hex').slice(0, 12)}'
const FILES = ${JSON.stringify(urls)}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Pages: network first so a deploy shows up at once, cache when offline (the fragment with inputs never reaches the worker).
// Hashed assets and the rest: cache first.
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== 'GET' || url.origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(url.pathname, copy))
          }
          return res
        })
        .catch(() =>
          caches.match(url.pathname).then((hit) => hit ?? caches.match('/404.html')),
        ),
    )
    return
  }
  e.respondWith(caches.match(req).then((hit) => hit ?? fetch(req)))
})
`,
)

if (missingOg.length)
  console.warn(`⚠ no public/og image for ${missingOg.length} pages — run npm run og`)
console.log(`prerendered ${pages.length} pages + 404, sw.js precaches ${urls.length} files`)
await rm(new URL('../dist-server', import.meta.url), { recursive: true })
