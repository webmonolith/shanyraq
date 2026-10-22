import './styles.css'
import { startAnalytics, track } from './analytics'

if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')

// Only the tool widget is interactive; the rest of the page is static prerendered HTML.
const el = document.getElementById('tool')
startAnalytics(el?.dataset.tool ?? (/^\/(ru|kk)\/$/.test(location.pathname) ? 'hub' : 'other'))
if (el) {
  const used = () => {
    track('tool_use', { tool: el.dataset.tool ?? '' })
    el.removeEventListener('input', used)
    el.removeEventListener('change', used)
  }
  el.addEventListener('input', used)
  el.addEventListener('change', used)
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

const top = document.querySelector('.top')
if (top) {
  const onScroll = () => top.classList.toggle('top--scrolled', window.scrollY > 4)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
}

const opener = document.querySelector<HTMLButtonElement>('[data-search]')
const finder = document.querySelector<HTMLDialogElement>('.finder')
const query = finder?.querySelector('input')
if (opener && finder && query) {
  const norm = (s: string) => s.toLowerCase().replaceAll('ё', 'е')
  const items = [...finder.querySelectorAll<HTMLAnchorElement>('li a')].map((a) => ({
    a,
    li: a.parentElement as HTMLElement,
    keys: norm(a.dataset.keys ?? ''),
  }))
  const empty = finder.querySelector<HTMLElement>('.finder__empty')
  let shown = items
  let active = 0

  const select = (i: number) => {
    active = (i + shown.length) % shown.length
    shown.forEach((it, j) => {
      if (j === active) {
        it.a.setAttribute('aria-selected', 'true')
        it.a.scrollIntoView({ block: 'nearest' })
      } else it.a.removeAttribute('aria-selected')
    })
  }
  const filter = () => {
    const words = norm(query.value).split(/\s+/).filter(Boolean)
    shown = items.filter((it) => words.every((w) => it.keys.includes(w)))
    for (const it of items) it.li.hidden = !shown.includes(it)
    if (empty) empty.hidden = shown.length > 0
    if (shown.length) select(0)
  }
  const open = () => {
    if (finder.open) return
    query.value = ''
    filter()
    finder.showModal()
    query.focus()
    track('finder_open')
  }

  opener.hidden = false
  if (!/Mac|iPhone|iPad/.test(navigator.platform)) {
    const kbd = opener.querySelector('kbd')
    if (kbd) kbd.textContent = 'Ctrl K'
  }
  opener.addEventListener('click', open)
  query.addEventListener('input', filter)
  for (const it of items) {
    it.a.addEventListener('click', () =>
      track('select_content', { content_type: 'tool', item_id: it.a.pathname }),
    )
  }
  query.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (shown.length) select(active + (e.key === 'ArrowDown' ? 1 : -1))
    } else if (e.key === 'Enter' && !e.isComposing) {
      shown[active]?.a.click()
    }
  })
  // A click on the backdrop lands on the dialog element itself.
  finder.addEventListener('click', (e) => {
    if (e.target === finder || (e.target as Element).closest('[data-close]')) finder.close()
  })
  document.addEventListener('keydown', (e) => {
    const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select')
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
      e.preventDefault()
      open()
    }
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
