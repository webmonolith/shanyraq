import { test } from 'vitest'
import { createFaker } from '../dist/faker/index.js'
import {
  calculateSalary,
  countWorkingDays,
  formatDate,
  grossFromNet,
  isValidIIN,
  loanSchedule,
  moneyToWords,
  parseIBAN,
  parseIIN,
  parsePhone,
  parsePlate,
  parseTaxId,
  taxDeadlines,
  toLatin,
  vacationPay,
} from '../dist/index.js'

const fake = createFaker(1)
const IINS = Array.from({ length: 1000 }, () => fake.iin())
const PHONES = Array.from({ length: 1000 }, () => fake.phone())
const IBANS = Array.from({ length: 1000 }, () => fake.iban())
const TEXT = 'Қазақстан Республикасының мемлекеттік тілі — қазақ тілі. '.repeat(20)

test('validators, 1000 inputs per iteration', async ({ bench }) => {
  await bench.compare(
    bench('isValidIIN', () => {
      for (const s of IINS) isValidIIN(s)
    }),
    bench('parseIIN', () => {
      for (const s of IINS) parseIIN(s)
    }),
    bench('parseTaxId', () => {
      for (const s of IINS) parseTaxId(s)
    }),
    bench('parsePhone', () => {
      for (const s of PHONES) parsePhone(s)
    }),
    bench('parseIBAN', () => {
      for (const s of IBANS) parseIBAN(s)
    }),
  )
})

test('single calls', async ({ bench }) => {
  await bench.compare(
    bench('parsePlate', () => {
      parsePlate('237 blm 01')
    }),
    bench('moneyToWords', () => {
      moneyToWords('1234567.89')
    }),
    bench('formatDate kk', () => {
      formatDate('2026-10-22', { lang: 'kk' })
    }),
    bench('toLatin, 1 200 chars', () => {
      toLatin(TEXT)
    }),
    bench('countWorkingDays, one year', () => {
      countWorkingDays('2026-01-01', '2026-12-31')
    }),
    bench('calculateSalary', () => {
      calculateSalary(500000)
    }),
    bench('grossFromNet', () => {
      grossFromNet(400000)
    }),
    bench('vacationPay', () => {
      vacationPay(6000000, '2026-07-01')
    }),
    bench('loanSchedule, 300 months with ГЭСВ', () => {
      loanSchedule(20000000, 7, 300)
    }),
    bench('taxDeadlines, all regimes', () => {
      taxDeadlines(2026)
    }),
  )
})
