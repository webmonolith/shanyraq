import type { ComponentType } from 'react'
import { renderToStaticMarkup, renderToString } from 'react-dom/server'
import { head } from './head'
import { PageView } from './page'
import { ogName, type Page, pageByPath, type ToolId } from './site'
import alimony from './tools/alimony'
import batch from './tools/batch'
import calendar from './tools/calendar'
import claim from './tools/claim'
import codes from './tools/codes'
import date from './tools/date'
import deadlines from './tools/deadlines'
import dismissal from './tools/dismissal'
import faker from './tools/faker'
import fees from './tools/fees'
import iban from './tools/iban'
import iin from './tools/iin'
import leave from './tools/leave'
import loan from './tools/loan'
import maternity from './tools/maternity'
import money from './tools/money'
import mortgage from './tools/mortgage'
import mrp from './tools/mrp'
import phone from './tools/phone'
import plate from './tools/plate'
import procedure from './tools/procedure'
import regions from './tools/regions'
import requisites from './tools/requisites'
import salary from './tools/salary'
import simplified from './tools/simplified'
import translit from './tools/translit'
import vat from './tools/vat'
import type { ToolProps } from './ui'

export { ogName, pages, SITE } from './site'

const WIDGETS: Record<ToolId, ComponentType<ToolProps>> = {
  iin,
  phone,
  codes,
  iban,
  plate,
  regions,
  batch,
  requisites,
  salary,
  vat,
  mrp,
  leave,
  dismissal,
  alimony,
  procedure,
  maternity,
  claim,
  simplified,
  deadlines,
  fees,
  loan,
  mortgage,
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
