import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'

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
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${pages.map(entry).join('\n')}\n</urlset>\n`,
)
await writeFile(
  new URL('robots.txt', dist),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,
)

if (missingOg.length)
  console.warn(`⚠ no public/og image for ${missingOg.length} pages — run npm run og`)
console.log(`prerendered ${pages.length} pages + 404`)
await rm(new URL('../dist-server', import.meta.url), { recursive: true })
