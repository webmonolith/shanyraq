import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const lib = fileURLToPath(new URL('../src', import.meta.url))
const template = new URL('index.html', import.meta.url)

// Dev renders every page the way the prerender does, so islands hydrate over the same markup.
const devPages = (): Plugin => ({
  name: 'dev-pages',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const path = (req.url ?? '/').split('?')[0] as string
      if (!path.endsWith('/')) return next()
      try {
        // A blocking <link> like the production build; the JS import alone would paint unstyled first.
        const source = (await readFile(template, 'utf8')).replace(
          '</head>',
          '<link rel="stylesheet" href="/src/styles.css" />\n  </head>',
        )
        const html = await server.transformIndexHtml(path, source)
        const { render } = await server.ssrLoadModule('/src/entry-server.tsx')
        const page = render(path, html, () => false)
        res.statusCode = page.status
        res.setHeader('content-type', 'text/html; charset=utf-8')
        res.end(page.html)
      } catch (e) {
        server.ssrFixStacktrace(e as Error)
        next(e)
      }
    })
  },
})

export default defineConfig({
  appType: 'mpa',
  plugins: [react(), devPages()],
  resolve: {
    alias: [
      { find: /^shanyraq$/, replacement: `${lib}/index.ts` },
      { find: /^shanyraq\/(.+)$/, replacement: `${lib}/$1/index.ts` },
    ],
  },
  server: { fs: { allow: ['..'] } },
})
