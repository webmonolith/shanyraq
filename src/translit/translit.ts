import { SCHEMES } from './generated'

export interface ToLatinOptions {
  /**
   * `2021` (default): Turkish-style İ/i, I/ı draft, never adopted. `2018`: acute scheme of
   * Decree No. 637, legally in force. Ё Ц Ч Щ Ъ Ь Э Ю Я follow common convention, not an act.
   */
  scheme?: '2021' | '2018'
}

const CYRILLIC = /[А-ЯЁӘҒҚҢӨҰҮҺІ]/i
const UPPER = /[А-ЯЁӘҒҚҢӨҰҮҺІ]/

/**
 * Kazakh Cyrillic to Latin. Case is mapped letter by letter (no `toUpperCase`, which breaks İ/ı);
 * a digraph is fully capitalized inside an all-caps word.
 * @example
 * toLatin('Қазақстан Республикасы') // 'Qazaqstan Respublikasy'
 * toLatin('ЦЕНТР') // 'TSENTR'
 */
export const toLatin = (text: string, options: ToLatinOptions = {}): string => {
  if (typeof text !== 'string') return ''
  const table = SCHEMES[options.scheme ?? '2021']
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i] as string
    if (!CYRILLIC.test(ch)) {
      out += ch
      continue
    }
    const upper = UPPER.test(ch)
    const [cap, small] = table[ch.toUpperCase()] as [string, string]
    if (!upper) out += small
    else if (cap.length < 2) out += cap
    else {
      const near = text[i + 1] ?? ''
      const allCaps = CYRILLIC.test(near) ? UPPER.test(near) : UPPER.test(text[i - 1] ?? '')
      out += allCaps ? cap[0] + small.slice(1).toUpperCase() : cap
    }
  }
  return out
}
