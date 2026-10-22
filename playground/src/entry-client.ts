import './styles.css'

if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')

// Only the tool widget is interactive; the rest of the page is static prerendered HTML.
const el = document.getElementById('tool')
if (el) {
  const lang = document.documentElement.lang
  Promise.all([
    import('react'),
    import('react-dom/client'),
    import(`./tools/${el.dataset.tool}.tsx`),
  ]).then(([{ createElement }, { hydrateRoot }, tool]) => {
    hydrateRoot(el, createElement(tool.default, { lang }))
  })
}

for (const box of document.querySelectorAll<HTMLElement>('[data-filter]')) {
  const input = box.querySelector('input')
  const rows = [...box.querySelectorAll<HTMLElement>('tbody tr')]
  if (!input) continue
  input.hidden = false
  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase()
    for (const row of rows) row.hidden = !!q && !row.textContent?.toLowerCase().includes(q)
  })
}

// Close the tools menu on outside click or Escape.
const menu = document.querySelector<HTMLDetailsElement>('.menu')
if (menu) {
  document.addEventListener('click', (e) => {
    if (menu.open && !menu.contains(e.target as Node)) menu.open = false
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') menu.open = false
  })
}

// Highlight the outline entry of the section being read.
const toc = document.querySelector('.toc')
if (toc) {
  const links = new Map(
    [...toc.querySelectorAll<HTMLAnchorElement>('a')].map((a) => [a.hash.slice(1), a]),
  )
  const spy = new IntersectionObserver(
    (entries) => {
      const hit = entries.find((e) => e.isIntersecting)
      if (!hit) return
      for (const a of links.values()) a.removeAttribute('aria-current')
      links.get(hit.target.id)?.setAttribute('aria-current', 'true')
    },
    { rootMargin: '-80px 0px -70% 0px' },
  )
  for (const id of links.keys()) {
    const el = document.getElementById(id)
    if (el) spy.observe(el)
  }
}
