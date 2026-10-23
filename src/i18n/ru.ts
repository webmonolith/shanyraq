import type { Messages } from './types'

// One const per module so `shanyraq/zod` bundles only the texts of its own schemas.

const iin: Messages['iin'] = {
  format: 'ИИН должен содержать только цифры',
  length: 'ИИН должен состоять из 12 цифр',
  date: 'Неверная дата рождения в ИИН',
  century: 'Неверная 7-я цифра ИИН (век и пол)',
  checksum: 'Неверная контрольная цифра ИИН',
}

const bin: Messages['bin'] = {
  format: 'БИН должен содержать только цифры',
  length: 'БИН должен состоять из 12 цифр',
  date: 'Неверный год или месяц регистрации в БИН',
  entityType: 'Неизвестный тип юридического лица (5-я цифра БИН)',
  divisionType: 'Неизвестный признак подразделения (6-я цифра БИН)',
  checksum: 'Неверная контрольная цифра БИН',
}

const taxid: Messages['taxid'] = {
  format: 'ИИН/БИН должен содержать только цифры',
  length: 'ИИН/БИН должен состоять из 12 цифр',
  kind: 'Номер не похож ни на ИИН, ни на БИН',
  checksum: 'Неверная контрольная цифра ИИН/БИН',
}

const phone: Messages['phone'] = {
  format: 'Неверный формат номера телефона',
  length: 'Неверная длина номера телефона',
  country: 'Поддерживаются только номера Казахстана (+7)',
  prefix: 'Неизвестный код оператора или города',
}

const iban: Messages['iban'] = {
  format: 'IBAN может содержать только латинские буквы и цифры',
  length: 'Казахстанский IBAN состоит из 20 символов',
  country: 'IBAN должен начинаться с KZ',
  checksum: 'Неверные контрольные цифры IBAN',
  bank: 'Неизвестный или недействующий код банка в IBAN',
}

const plate: Messages['plate'] = {
  format: 'Неверный формат госномера',
  region: 'Неизвестный код региона в госномере',
}

const money: Messages['money'] = {
  invalid: 'Сумма должна быть конечным числом',
  range: 'Сумма вне поддерживаемого диапазона (до 999 трлн)',
}

const date: Messages['date'] = {
  format: 'Неверный формат даты',
  date: 'Такой даты не существует',
}

const calendar: Messages['calendar'] = {
  date: 'Неверная дата, ожидается ГГГГ-ММ-ДД',
  range: 'Недопустимый диапазон дат или число дней',
  data: 'Нет данных о Курбан айте или переносах выходных за этот год',
}

const tax: Messages['tax'] = {
  invalid: 'Введите сумму числом',
  range: 'Сумма, ставка или месяц вне допустимого диапазона',
  data: 'Нет данных о МРП, МЗП и ставках за этот год',
}

const leave: Messages['leave'] = {
  invalid: 'Введите сумму заработка числом',
  range: 'Сумма, количество дней или период вне допустимого диапазона',
  date: 'Неверная дата, ожидается ГГГГ-ММ-ДД',
  data: 'Нет данных о МРП или календаре за этот год',
}

const loan: Messages['loan'] = {
  invalid: 'Введите сумму займа числом',
  range: 'Сумма, ставка, срок или платёж вне допустимого диапазона',
  date: 'Неверная дата, ожидается ГГГГ-ММ-ДД',
  data: 'Нет данных о предельной ГЭСВ на эту дату',
}

const alimony: Messages['alimony'] = {
  invalid: 'Введите доход числом',
  range: 'Доход, доля, сумма или число детей вне допустимого диапазона',
  date: 'Неверная дата, ожидается ГГГГ-ММ-ДД',
  data: 'Нет ставок налогов или МРП за этот год',
}

const claim: Messages['claim'] = {
  invalid: 'Введите сумму числом',
  range: 'Сумма, даты, ставка или оплаты вне допустимого диапазона',
  date: 'Неверная дата, ожидается ГГГГ-ММ-ДД',
  data: 'Нет базовой ставки или МРП на эту дату',
}

const family: Messages['family'] = {
  invalid: 'Введите доход числом',
  range: 'Доход, число месяцев, дней или очерёдность ребёнка вне допустимого диапазона',
  data: 'Нет МРП или МЗП за этот год',
}

const vehicle: Messages['vehicle'] = {
  invalid: 'Введите объём, мощность, грузоподъёмность или массу числом',
  range: 'Год выпуска или число месяцев вне допустимого диапазона',
  data: 'Нет МРП за этот год',
}

const property: Messages['property'] = {
  invalid: 'Введите стоимость или площадь числом',
  range: 'Площадь, год, доля, месяцы или коэффициент вне допустимого диапазона',
  data: 'Нет МРП за этот или предыдущий год',
}

const deadlines: Messages['deadlines'] = {
  range: 'Год вне допустимого диапазона',
  data: 'Нет данных производственного календаря за этот год',
}

export const ru: Messages = {
  iin,
  bin,
  taxid,
  phone,
  iban,
  plate,
  money,
  date,
  calendar,
  tax,
  leave,
  loan,
  deadlines,
  alimony,
  claim,
  family,
  vehicle,
  property,
}

export {
  bin as binRu,
  iban as ibanRu,
  iin as iinRu,
  phone as phoneRu,
  plate as plateRu,
  taxid as taxidRu,
}
