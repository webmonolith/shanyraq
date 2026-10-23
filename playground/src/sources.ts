// Server-only: links are read from data/*.json so pages cite exactly what the library is built from.

import alimony from '../../data/alimony.json'
import banks from '../../data/banks.json'
import calendar from '../../data/calendar.json'
import claim from '../../data/claim.json'
import customsData from '../../data/customs.json'
import deadlines from '../../data/deadlines.json'
import family from '../../data/family.json'
import fees from '../../data/fees.json'
import inheritanceData from '../../data/inheritance.json'
import language from '../../data/language.json'
import leave from '../../data/leave.json'
import loan from '../../data/loan.json'
import pensionData from '../../data/pension.json'
import phone from '../../data/phone.json'
import plates from '../../data/plates.json'
import procedure from '../../data/procedure.json'
import propertyData from '../../data/property.json'
import regions from '../../data/regions.json'
import tax from '../../data/tax.json'
import taxid from '../../data/taxid.json'
import translit from '../../data/translit-2021.json'
import vehicleData from '../../data/vehicle.json'
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
  codes: linked(phone.source.filter((s) => s.id === 'itu-nnp-kz')),
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
  leave: [...linked(leave.source), calendar.law],
  sick: [...linked(leave.source), ...taxSource('budget2026'), calendar.law],
  dismissal: [...linked(leave.source), calendar.law],
  procedure: [...linked(procedure.source), calendar.law],
  claim: [...linked(claim.source), ...taxSource('budget2026')],
  pension: linked(pensionData.source),
  inheritance: [
    ...linked(inheritanceData.source),
    calendar.law,
    ...taxSource('taxCode', 'budget2026'),
  ],
  duty: [
    ...linked(claim.source.filter((s) => s.id === 'taxCode' || s.id === 'civilProcedureCode')),
    ...taxSource('budget2026'),
  ],
  penalty: [
    ...linked(claim.taxPenalty.source),
    ...linked(claim.source.filter((s) => s.id === 'nbrkRates')),
  ],
  maternity: [...linked(family.source), ...taxSource('budget2026')],
  childcare: [...linked(family.source), ...taxSource('budget2026')],
  vehicle: [...linked(vehicleData.source), ...taxSource('budget2026')],
  registration: [...linked(vehicleData.source), ...linked(fees.source), ...taxSource('budget2026')],
  customs: [
    ...linked(customsData.source),
    ...linked(vehicleData.source),
    ...linked(fees.source),
    ...taxSource('budget2026'),
  ],
  property: [...linked(propertyData.source), ...taxSource('budget2026')],
  land: [...linked(propertyData.source), ...taxSource('budget2026')],
  alimony: [
    ...linked(alimony.source),
    ...taxSource('taxCode', 'socialCode', 'osmsLaw', 'budget2026'),
  ],
  simplified: taxSource('taxCode', 'socialCode', 'osmsLaw', 'budget2026'),
  fees: [...linked(fees.source), ...taxSource('budget2026')],
  deadlines: [...linked(deadlines.source), calendar.law],
  loan: linked(loan.source.filter((s) => s.id !== 'programme72025' && !/Nauryz|Otau/.test(s.id))),
  mortgage: linked(loan.source),
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

// Latest `retrievedAt` of the data files behind each page: shown as «data checked on» and used as dateModified.
const latest = (...files: { retrievedAt: string }[]): string =>
  files
    .map((f) => f.retrievedAt)
    .sort()
    .at(-1) as string

export const CHECKED: Record<ToolId, string> = {
  iin: latest(taxid),
  phone: latest(phone),
  codes: latest(phone),
  iban: latest(banks),
  plate: latest(plates, regions),
  regions: latest(regions),
  batch: latest(taxid, phone, banks, plates),
  requisites: latest(taxid, banks, phone),
  salary: latest(tax),
  vat: latest(tax),
  mrp: latest(tax),
  leave: latest(leave, calendar),
  sick: latest(leave, calendar, tax),
  dismissal: latest(leave, calendar),
  maternity: latest(family, tax),
  childcare: latest(family, tax),
  pension: latest(pensionData, tax),
  alimony: latest(alimony, tax),
  procedure: latest(procedure, calendar),
  claim: latest(claim, tax),
  duty: latest(claim, tax),
  inheritance: latest(inheritanceData, procedure, calendar, fees, tax),
  simplified: latest(tax),
  fees: latest(fees, tax),
  vehicle: latest(vehicleData, tax),
  registration: latest(vehicleData, fees, tax),
  customs: latest(customsData, vehicleData, fees, tax),
  property: latest(propertyData, tax),
  land: latest(propertyData, tax),
  deadlines: latest(deadlines, calendar),
  penalty: latest(claim),
  loan: latest(loan),
  mortgage: latest(loan),
  money: latest(language),
  calendar: latest(calendar),
  date: latest(language),
  translit: latest(translit),
  faker: latest(taxid, phone, banks, plates),
}
