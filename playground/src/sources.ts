// Server-only: links are read from data/*.json so pages cite exactly what the library is built from.
import banks from '../../data/banks.json'
import calendar from '../../data/calendar.json'
import language from '../../data/language.json'
import phone from '../../data/phone.json'
import plates from '../../data/plates.json'
import regions from '../../data/regions.json'
import tax from '../../data/tax.json'
import taxid from '../../data/taxid.json'
import translit from '../../data/translit-2021.json'
import type { ToolId } from './site'

export interface Source {
  title: string
  url: string
}

// `https://… (title)` strings in data files.
const fromString = (s: string, fallback: string): Source => {
  const m = /^(https?:\/\/\S+)(?:\s*\((.*)\))?/.exec(s)
  return { url: m?.[1] ?? '', title: m?.[2] ?? fallback }
}

const linked = (list: { title: string; url: string | null }[]): Source[] =>
  list.flatMap((s) => (s.url ? [{ title: s.title, url: s.url }] : []))

const act = (a: { title: string; act?: string; status?: string; source: string }): Source => ({
  title: [a.title, a.act ?? a.status].filter(Boolean).join('. '),
  url: a.source,
})

const transfers = Object.values(calendar.transfers).flatMap((t) =>
  t.act && t.url ? [{ title: t.act, url: t.url }] : [],
)

const kurbanAit = Object.entries(calendar.kurbanAit).flatMap(([year, k]) => {
  const url = /https?:\/\/\S+?(?=[\s)]|$)/.exec(k.source)?.[0]
  return url ? [{ title: `Құрбан айт ${year}: ${new URL(url).hostname}`, url }] : []
})

const lang = language.sources

const taxSource = (...ids: string[]): Source[] =>
  tax.source.filter((s) => ids.includes(s.id)).map((s) => ({ title: s.title, url: s.url }))

export const SOURCES: Record<ToolId, Source[]> = {
  iin: [
    act(taxid.acts.iinRules2023),
    act(taxid.acts.binRules2023),
    act(taxid.acts.law),
    act(taxid.acts.rules2007Repealed),
    {
      title: 'Постановление Правительства РК от 26.08.2013 № 853 (структура ИИН убрана из Правил)',
      url: taxid.iin.structureRemoved2013.source,
    },
  ],
  phone: linked(phone.source),
  iban: [
    { title: 'Справочник БИК РК, Национальный Банк РК', url: banks.source[0] as string },
    fromString(banks.iban.source, 'IBAN'),
  ],
  plate: [...linked(plates.source), ...linked(regions.source.slice(0, 1))],
  regions: linked(regions.source),
  batch: [],
  requisites: [],
  salary: taxSource('taxCode', 'socialCode', 'osmsLaw', 'budget2026'),
  vat: taxSource('taxCode', 'budget2026'),
  mrp: taxSource('budget2026', 'taxCode', 'socialCode', 'osmsLaw'),
  money: [lang.nbrk208, lang.law306, lang.koapKk, lang.gramota],
  calendar: [
    calendar.law,
    { title: 'Трудовой кодекс РК (ст. 84 п. 5, ст. 85 п. 3)', url: calendar.source[4] as string },
    ...transfers,
    ...kurbanAit,
  ],
  date: [lang.docRules2023, lang.draftDecree2021],
  translit: [
    { title: `Проект Указа «${translit.act.title_ru}» (2021, не принят)`, url: translit.act.url },
    { title: translit.otherSchemes['2018'].act, url: translit.otherSchemes['2018'].url },
  ],
  faker: [],
}
