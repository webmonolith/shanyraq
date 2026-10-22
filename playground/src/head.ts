import { hubPath, LANGS, type Page, SITE } from './site'

const attr = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

const json = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c')

const LOCALE = { ru: 'ru_KZ', kk: 'kk_KZ' } as const

const schema = (page: Page): object[] => {
  const url = SITE + page.path
  if (page.kind === 'root' || page.kind === 'hub')
    return [
      {
        '@type': 'WebSite',
        name: 'shanyraq',
        url,
        inLanguage: page.lang,
        description: page.description,
      },
    ]
  return [
    {
      '@type': 'WebApplication',
      name: page.h1,
      url,
      description: page.description,
      inLanguage: page.lang,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'KZT' },
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'shanyraq', item: SITE + hubPath(page.lang) },
        { '@type': 'ListItem', position: 2, name: page.name, item: url },
      ],
    },
  ]
}

/** Everything that goes into <head> besides charset, viewport and assets. */
export const head = (page: Page, og: string | undefined): string => {
  const url = SITE + page.path
  const title = page.kind === 'tool' ? `${page.title} — shanyraq` : page.title
  if (page.kind === 'notFound')
    return `<title>${attr(title)}</title>\n<meta name="robots" content="noindex" />`
  const alternates = page.alternates
    ? [
        ...LANGS.map((l) => [l, page.alternates?.[l]] as const),
        ['x-default', page.kind === 'hub' ? '/' : page.alternates.ru] as const,
      ]
    : [['x-default', page.path] as const]
  const image = og ? `${SITE}/og/${og}.png` : undefined
  const tags = [
    `<title>${attr(title)}</title>`,
    `<meta name="description" content="${attr(page.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="manifest" href="/manifest.${page.lang}.webmanifest" />`,
    ...alternates.map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${SITE}${p}" />`),
    '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />',
    '<meta name="theme-color" content="#111413" media="(prefers-color-scheme: dark)" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="shanyraq" />',
    `<meta property="og:title" content="${attr(page.h1)}" />`,
    `<meta property="og:description" content="${attr(page.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${LOCALE[page.lang]}" />`,
    ...(image
      ? [
          `<meta property="og:image" content="${image}" />`,
          '<meta property="og:image:width" content="1200" />',
          '<meta property="og:image:height" content="630" />',
          '<meta name="twitter:card" content="summary_large_image" />',
        ]
      : []),
    `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': schema(page) })}</script>`,
  ]
  return tags.join('\n    ')
}
