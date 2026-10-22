// Server-only hand-drawn icons in the webmonolith.kz style: slightly wobbly ink outlines, one accent fill.
import type { ReactNode } from 'react'
import type { ToolId } from './site'

const n = (v: number) => Math.round(v * 10) / 10

const wr = (x0: number, y0: number, x1: number, y1: number) => {
  const w = x1 - x0
  const h = y1 - y0
  return `M${x0} ${n(y0 + 0.4)}C${n(x0 + w * 0.3)} ${n(y0 - 0.3)} ${n(x1 - w * 0.3)} ${n(y0 - 0.2)} ${x1} ${n(y0 + 0.3)} ${n(x1 + 0.4)} ${n(y0 + h * 0.3)} ${n(x1 + 0.3)} ${n(y1 - h * 0.3)} ${n(x1 - 0.1)} ${y1} ${n(x1 - w * 0.3)} ${n(y1 + 0.4)} ${n(x0 + w * 0.3)} ${n(y1 + 0.3)} ${n(x0 + 0.3)} ${n(y1 - 0.1)} ${n(x0 - 0.3)} ${n(y1 - h * 0.3)} ${n(x0 - 0.2)} ${n(y0 + h * 0.3)} ${x0} ${n(y0 + 0.4)}Z`
}

const wc = (cx: number, cy: number, r: number) => {
  const k = 0.55 * r
  return `M${cx} ${n(cy - r)}C${n(cx + k)} ${n(cy - r - 0.2)} ${n(cx + r + 0.3)} ${n(cy - k)} ${n(cx + r + 0.2)} ${cy} ${n(cx + r)} ${n(cy + k)} ${n(cx + k + 0.2)} ${n(cy + r + 0.2)} ${cx} ${n(cy + r)} ${n(cx - k)} ${n(cy + r - 0.1)} ${n(cx - r - 0.2)} ${n(cy + k)} ${n(cx - r)} ${cy} ${n(cx - r + 0.1)} ${n(cy - k)} ${n(cx - k - 0.3)} ${n(cy - r + 0.2)} ${cx} ${n(cy - r)}Z`
}

const wl = (x0: number, y0: number, x1: number, y1: number) => {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const bend = Math.min(0.8, len * 0.03)
  const qx = (x0 + x1) / 2 - ((y1 - y0) / len) * bend
  const qy = (y0 + y1) / 2 + ((x1 - x0) / len) * bend
  return `M${x0} ${y0}Q${n(qx)} ${n(qy)} ${x1} ${y1}`
}

const rr = (x0: number, y0: number, x1: number, y1: number, r: number) => {
  const w = x1 - x0
  const h = y1 - y0
  return `M${x0 + r} ${y0}C${n(x0 + w * 0.4)} ${n(y0 - 0.6)} ${n(x1 - w * 0.4)} ${n(y0 - 0.4)} ${x1 - r} ${y0}Q${x1} ${y0} ${x1} ${y0 + r}C${n(x1 + 0.6)} ${n(y0 + h * 0.4)} ${n(x1 + 0.5)} ${n(y1 - h * 0.4)} ${x1} ${y1 - r}Q${x1} ${y1} ${x1 - r} ${y1}C${n(x1 - w * 0.4)} ${n(y1 + 0.6)} ${n(x0 + w * 0.4)} ${n(y1 + 0.5)} ${x0 + r} ${y1}Q${x0} ${y1} ${x0} ${y1 - r}C${n(x0 - 0.6)} ${n(y1 - h * 0.4)} ${n(x0 - 0.5)} ${n(y0 + h * 0.4)} ${x0} ${y0 + r}Q${x0} ${y0} ${x0 + r} ${y0}Z`
}

const ICONS: Record<ToolId, ReactNode> = {
  iin: (
    <>
      <path d={wr(7, 14, 57, 50)} />
      <path className="f" d={wr(13, 21, 29, 43)} />
      <path className="bg" d={wc(21, 28.5, 3.6)} />
      <path d="M15.5 42.6C16 37.6 26 37.6 26.6 42.6" />
      <path d={`${wl(35, 24, 51, 24)}${wl(35, 31.5, 48, 31.5)}${wl(35, 39, 44, 39)}`} />
    </>
  ),
  phone: (
    <>
      <path d={wr(20, 7.5, 44, 56.4)} />
      <path d="M29 12.6H35" />
      <path className="f" d={wr(24.5, 19, 39.5, 27.6)} />
      <circle className="k" cx="32" cy="51.4" r="1.7" />
      <path d="M49 23C51.8 26.4 51.8 31.6 49 35M53.4 18.6C58.6 24.4 58.6 33.6 53.4 39.4M15 23C12.2 26.4 12.2 31.6 15 35" />
    </>
  ),
  iban: (
    <>
      <path
        className="f"
        d="M8 23.6C16 18.8 24 14.4 32 9.6 40 14.4 48 18.8 56 23.6 40 24.2 24 24.2 8 23.6Z"
      />
      <path d={wl(10, 28.5, 54, 28.5)} />
      <path
        d={`${wl(15, 32, 15, 45)}${wl(25, 32, 25, 45)}${wl(39, 32, 39, 45)}${wl(49, 32, 49, 45)}`}
      />
      <path d={wr(8, 48.5, 56, 54.5)} />
    </>
  ),
  plate: (
    <>
      <path d={rr(5, 20, 59, 44, 4)} />
      <path d="M11.5 28.6 14 27V37M19 37 22 27 25 37M20.2 33.5H23.8M29.5 27V37M36 27 30.2 32.4 36 37" />
      <path className="f" d={wr(42, 24.5, 54, 39.5)} />
    </>
  ),
  regions: (
    <>
      <path d="M7 17.4C12 15.6 17 13.6 22 11.6 28.6 13.6 35.4 15.6 42 17.6 47 15.6 52 13.6 57 11.8 57.3 24 57.2 36 57 48.4 52 50.4 47 52.4 42 54.2 35.4 52.2 28.6 50.2 22 48.2 17 50.2 12 52.2 7 54 6.8 42 6.7 29.6 7 17.4Z" />
      <path d={`${wl(22, 11.6, 22, 48.2)}${wl(42, 17.6, 42, 54.2)}`} />
      <path
        className="f"
        d="M32 44.6C26.4 37.4 23.4 32.8 23.4 28.2 23.4 23.2 27.2 19.4 32 19.4 36.8 19.4 40.6 23.2 40.6 28.2 40.6 32.8 37.6 37.4 32 44.6Z"
      />
      <path className="bg" d={wc(32, 28, 3.4)} />
    </>
  ),
  batch: (
    <>
      <path d={wr(10, 7, 54, 57)} />
      {[18, 32, 46].map((y) => (
        <path key={y} d={rr(16, y - 4.5, 25, y + 4.5, 2)} />
      ))}
      <path className="f" d={rr(16, 13.5, 25, 22.5, 2)} />
      <path d="M17.8 18.2 20 20.4 23.6 15.8M17.8 32.2 20 34.4 23.6 29.8M18 44 23 49M23 44 18 49" />
      <path d={`${wl(30, 18, 48, 18)}${wl(30, 32, 46, 32)}${wl(30, 46, 43, 46)}`} />
    </>
  ),
  requisites: (
    <>
      <path d={wr(8, 10, 46, 54)} />
      <path
        d={`${wl(15, 20, 38, 20)}${wl(15, 28, 34, 28)}${wl(15, 36, 30, 36)}${wl(15, 44, 26, 44)}`}
      />
      <path className="f" d={wc(45, 43, 11)} />
      <path d={wc(45, 43, 11)} />
      <path d="M39.6 43.2 43.4 47 50.6 39.4" />
    </>
  ),
  salary: (
    <>
      <path className="bg" d={wr(10, 12, 58, 38)} />
      <path d={wr(10, 12, 58, 38)} />
      <path className="f" d={wr(6, 22, 54, 50)} />
      <path d={wr(6, 22, 54, 50)} />
      <path className="bg" d={wc(30, 36, 7)} />
      <path d={wc(30, 36, 7)} />
      <path d="M27 33.4H33M27 36H33M30 36V40" />
      <circle className="k" cx="13.5" cy="29" r="1.6" />
      <circle className="k" cx="46.5" cy="43" r="1.6" />
    </>
  ),
  vat: (
    <>
      <path d="M8 30.6 30.8 8.2C31.6 7.4 32.6 7 33.7 7.1L53.2 8.6C55 8.8 55.3 9.1 55.4 10.8L56.9 30.3C57 31.4 56.6 32.4 55.8 33.2L33.4 56C32.2 57.2 30.4 57.2 29.2 56L8 34.8C6.8 33.6 6.8 31.8 8 30.6Z" />
      <circle className="f" cx="46" cy="18" r="4" />
      <path d="M37.5 26.5 22 42" />
      <path d={`${wc(24, 28.5, 3.6)}${wc(35.5, 40, 3.6)}`} />
    </>
  ),
  mrp: (
    <>
      <path d={rr(14, 7, 50, 57, 5)} />
      <path className="f" d={wr(20, 13, 44, 25)} />
      <path d="M36 19H40" />
      {[33, 41, 49].flatMap((y) =>
        [23, 32, 41].map((x) => <circle key={`${x}-${y}`} className="k" cx={x} cy={y} r="2" />),
      )}
    </>
  ),
  leave: (
    <>
      <path className="bg" d={rr(8, 14, 50, 56, 5)} />
      <path d={rr(8, 14, 50, 56, 5)} />
      <path d={`${wl(8, 24, 50, 24)}M18 9V18M40 9V18`} />
      <path d={`${wl(15, 32, 22, 32)}${wl(27, 32, 34, 32)}${wl(15, 41, 22, 41)}`} />
      <path className="f" d={wc(46, 45, 10)} />
      <path d={wc(46, 45, 10)} />
      <path d="M46 40V50M41 45H51" />
    </>
  ),
  simplified: (
    <>
      <path className="f" d={wr(12, 8, 46, 56)} />
      <path d={wr(12, 8, 46, 56)} />
      <path d={`${wl(19, 18, 39, 18)}${wl(19, 26, 34, 26)}`} />
      <path d="M22 47 36 33" />
      <path d={`${wc(23.5, 35, 2.8)}${wc(34.5, 45, 2.8)}`} />
      <circle className="k" cx="52" cy="14" r="1.6" />
    </>
  ),
  fees: (
    <>
      <path className="f" d={wc(32, 17, 9)} />
      <path d={wc(32, 17, 9)} />
      <path d="M28 26 26.5 37H37.5L36 26" />
      <path className="bg" d={rr(11, 37, 53, 47, 3)} />
      <path d={rr(11, 37, 53, 47, 3)} />
      <path d={wl(14, 55, 50, 55)} />
    </>
  ),
  money: (
    <>
      <path className="f" d={wc(32, 32, 20)} />
      <path d={wc(32, 32, 20)} />
      <path d="M24 23H40M24 28.5H40M32 28.5V44" />
    </>
  ),
  calendar: (
    <>
      <path d={wr(9, 13, 55, 55)} />
      <path d={wl(9, 24, 55, 24)} />
      <path d="M21 8V17M43 8V17" />
      {[18, 26, 34, 42].map((x) => (
        <circle key={x} className="k" cx={x} cy="32.5" r="1.7" />
      ))}
      {[18, 26, 34].map((x) => (
        <circle key={x} className="k" cx={x} cy="41" r="1.7" />
      ))}
      <circle className="f" cx="42" cy="41" r="4" />
    </>
  ),
  date: (
    <>
      <path d="M14 9.5C23 9.1 32 9 40.5 9.4L50 19C50.4 31 50.4 43 50 54.6 38 55 26 55 14.4 54.6 13.8 40 13.7 24 14 9.5Z" />
      <path d="M40.5 9.6V19.2H49.8" />
      <path d={`${wl(20, 22.5, 32, 22.5)}${wl(20, 29.5, 43, 29.5)}${wl(20, 36.5, 36, 36.5)}`} />
      <path d="M19 48C21.5 43 23.5 50 26 46 27.5 43.6 28.5 47.5 31 46.5" />
      <circle className="f" cx="41" cy="46" r="6.5" />
    </>
  ),
  translit: (
    <>
      <path d={wr(6, 9, 34, 37)} />
      <path d="M14 15.5V30.5M14 23.4 23 15.5M15.6 22.2 23.4 30.5V34" />
      <path className="f" d={wr(29, 27, 58, 55)} />
      <path d={wr(29, 27, 58, 55)} />
      <path className="bg" d={wc(43.5, 40.5, 6.6)} />
      <path d="M46.6 44 51 48.6" />
    </>
  ),
  faker: (
    <>
      <path className="bg" d={rr(8, 20, 38, 50, 6)} />
      <path d={rr(8, 20, 38, 50, 6)} />
      {[
        [16, 28],
        [30, 28],
        [16, 42],
        [30, 42],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} className="k" cx={x} cy={y} r="2" />
      ))}
      <path className="f" d={rr(28, 8, 56, 36, 6)} />
      <path d={rr(28, 8, 56, 36, 6)} />
      {[35, 42, 49].map((v) => (
        <circle key={v} className="bg" cx={v} cy={v - 20} r="2.1" />
      ))}
    </>
  ),
}

export const ToolIcon = ({ id, size = 'md' }: { id: ToolId; size?: 'sm' | 'md' | 'lg' }) => (
  <svg className={`doodle doodle--${size}`} viewBox="0 0 64 64" aria-hidden="true">
    {ICONS[id]}
  </svg>
)

/** Shanyraq: the rim and the crossed roof bars of a yurt crown. */
// yurt with the shanyraq crown above the roof; shared with favicon.svg and OG cards
export const LOGO_PATH =
  'M3.5 27V17.6Q3.5 16.4 4.6 15.8L12.2 11.4H19.8L27.4 15.8Q28.5 16.4 28.5 17.6V27ZM13.4 27V22.4a2.6 2.6 0 0 1 5.2 0V27ZM12.9 7.4h6.2a1.3 1.3 0 0 1 0 2.6h-6.2a1.3 1.3 0 0 1 0-2.6Z'

export const Logo = () => (
  <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
    <path fillRule="evenodd" d={LOGO_PATH} />
  </svg>
)
