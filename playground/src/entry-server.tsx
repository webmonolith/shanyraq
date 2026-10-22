import type { ComponentType } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { head } from './head'
import { PageView } from './page'
import { ogName, type Page, pageByPath, type ToolId } from './site'
import calendar from './tools/calendar'
import date from './tools/date'
import faker from './tools/faker'
import iban from './tools/iban'
import iin from './tools/iin'
import money from './tools/money'
import phone from './tools/phone'
import plate from './tools/plate'
import translit from './tools/translit'
import type { ToolProps } from './ui'

export { ogName, pages, SITE } from './site'

const WIDGETS: Record<ToolId, ComponentType<ToolProps>> = {
  iin,
  phone,
  iban,
  plate,
  money,
  calendar,
  date,
  translit,
  faker,
}

const Widget = (page: Page): string => {
  const W = page.tool && WIDGETS[page.tool]
  return W ? renderToString(<W lang={page.lang} />) : ''
}

/** Full HTML of a page; `hasOg` tells whether public/og/<name>.png exists. */
export const render = (path: string, template: string, hasOg: (name: string) => boolean) => {
  const page = pageByPath(path)
  const og = ogName(page)
  const app = renderToStaticMarkup(<PageView page={page} widget={Widget(page)} />)
  const html = template
    .replace('<html lang="ru">', `<html lang="${page.lang}">`)
    .replace('<!--head-->', head(page, hasOg(og) ? og : undefined))
    .replace('<!--app-->', app)
  return { page, status: page.kind === 'notFound' ? 404 : 200, html }
}
