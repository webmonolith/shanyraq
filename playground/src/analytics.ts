const ID = 'G-QZPXVRB6KG'
const HOST = 'shanyraq.webmonolith.kz'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

// Widgets keep their input in ?q= (IIN, IBAN, sums), so nothing past the path may reach Google.
const clean = (url: string) => {
  try {
    const u = new URL(url)
    return u.origin + u.pathname
  } catch {
    return ''
  }
}

/** Loads GA only on the production host, so dev and preview builds never report. */
export const startAnalytics = (group: string) => {
  if (!import.meta.env.PROD || location.hostname !== HOST) return
  window.dataLayer ??= []
  const layer = window.dataLayer
  window.gtag = function gtag() {
    // gtag.js only accepts the Arguments object, not an array.
    // biome-ignore lint/complexity/noArguments: see above
    layer.push(arguments)
  }
  window.gtag('js', new Date())
  // `config` covers only the first page_view; `set` keeps later events and history page views clean too.
  window.gtag('set', {
    page_location: clean(location.href),
    page_referrer: document.referrer ? clean(document.referrer) : '',
  })
  window.gtag('config', ID, {
    page_location: clean(location.href),
    ...(document.referrer && { page_referrer: clean(document.referrer) }),
    content_group: group,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID}`
  document.head.append(script)
}

/** Sends an event without any user input in it. */
export const track = (name: string, params?: Record<string, string>) =>
  window.gtag?.('event', name, params)
