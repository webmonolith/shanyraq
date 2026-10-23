import type { Messages } from './types'

// TODO(verify): wording reviewed by a native speaker before 1.0.0.
const iin: Messages['iin'] = {
  format: 'ЖСН тек цифрлардан тұруы керек',
  length: 'ЖСН 12 цифрдан тұруы керек',
  date: 'ЖСН-дегі туған күні қате',
  century: 'ЖСН-нің 7-цифры (ғасыр мен жыныс) қате',
  checksum: 'ЖСН-нің бақылау цифры қате',
}

const bin: Messages['bin'] = {
  format: 'БСН тек цифрлардан тұруы керек',
  length: 'БСН 12 цифрдан тұруы керек',
  date: 'БСН-дегі тіркелген жылы немесе айы қате',
  entityType: 'Заңды тұлғаның түрі белгісіз (БСН-нің 5-цифры)',
  divisionType: 'Бөлімше белгісі белгісіз (БСН-нің 6-цифры)',
  checksum: 'БСН-нің бақылау цифры қате',
}

const taxid: Messages['taxid'] = {
  format: 'ЖСН/БСН тек цифрлардан тұруы керек',
  length: 'ЖСН/БСН 12 цифрдан тұруы керек',
  kind: 'Нөмір ЖСН-ге де, БСН-ге де ұқсамайды',
  checksum: 'ЖСН/БСН-нің бақылау цифры қате',
}

const phone: Messages['phone'] = {
  format: 'Телефон нөмірінің пішімі қате',
  length: 'Телефон нөмірінің ұзындығы қате',
  country: 'Тек Қазақстан нөмірлеріне (+7) қолдау көрсетіледі',
  prefix: 'Оператор немесе қала коды белгісіз',
}

const iban: Messages['iban'] = {
  format: 'IBAN тек латын әріптері мен цифрлардан тұруы керек',
  length: 'Қазақстандық IBAN 20 таңбадан тұрады',
  country: 'IBAN KZ әріптерінен басталуы керек',
  checksum: 'IBAN-ның бақылау цифрлары қате',
  bank: 'IBAN-дағы банк коды белгісіз немесе жарамсыз',
}

const plate: Messages['plate'] = {
  format: 'Мемлекеттік нөмірдің пішімі қате',
  region: 'Мемлекеттік нөмірдегі өңір коды белгісіз',
}

const money: Messages['money'] = {
  invalid: 'Сома шекті сан болуы керек',
  range: 'Сома қолдау көрсетілетін ауқымнан тыс (999 трлн-ға дейін)',
}

const date: Messages['date'] = {
  format: 'Күн пішімі қате',
  date: 'Мұндай күн жоқ',
}

const calendar: Messages['calendar'] = {
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
  range: 'Күндер аралығы немесе күн саны жарамсыз',
  data: 'Бұл жылғы Құрбан айт пен демалыс күндерін ауыстыру туралы деректер жоқ',
}

const tax: Messages['tax'] = {
  invalid: 'Соманы санмен енгізіңіз',
  range: 'Сома, мөлшерлеме немесе ай рұқсат етілген ауқымнан тыс',
  data: 'Бұл жылғы АЕК, ЕТЖ және мөлшерлемелер туралы деректер жоқ',
}

const leave: Messages['leave'] = {
  invalid: 'Табыс сомасын санмен енгізіңіз',
  range: 'Сома, күн саны немесе кезең рұқсат етілген ауқымнан тыс',
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
  data: 'Бұл жылғы АЕК немесе күнтізбе туралы деректер жоқ',
}

const loan: Messages['loan'] = {
  invalid: 'Қарыз сомасын санмен енгізіңіз',
  range: 'Сома, мөлшерлеме, мерзім немесе төлем рұқсат етілген ауқымнан тыс',
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
  data: 'Бұл күнге ЖТСМ шекті мөлшері туралы деректер жоқ',
}

const deadlines: Messages['deadlines'] = {
  range: 'Жыл рұқсат етілген ауқымнан тыс',
  data: 'Бұл жылғы өндірістік күнтізбе деректері жоқ',
}

const alimony: Messages['alimony'] = {
  invalid: 'Табысты санмен енгізіңіз',
  range: 'Табыс, үлес, сома немесе балалар саны рұқсат етілген ауқымнан тыс',
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
  data: 'Бұл жылға салық мөлшерлемелері немесе АЕК жоқ',
}

const claim: Messages['claim'] = {
  invalid: 'Соманы санмен енгізіңіз',
  range: 'Сома, күндер, мөлшерлеме немесе төлемдер рұқсат етілген ауқымнан тыс',
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
  data: 'Бұл күнге базалық мөлшерлеме немесе АЕК жоқ',
}

const family: Messages['family'] = {
  invalid: 'Табысты санмен енгізіңіз',
  range: 'Табыс, айлар, күндер саны немесе баланың кезектілігі рұқсат етілген ауқымнан тыс',
  data: 'Бұл жылға АЕК немесе ЕТЖ жоқ',
}

const vehicle: Messages['vehicle'] = {
  invalid: 'Көлемді, қуатты, жүк көтергіштікті немесе массаны санмен енгізіңіз',
  range: 'Шығарылған жылы, айлар саны, көлемі немесе массасы рұқсат етілген ауқымнан тыс',
  data: 'Бұл жылға АЕК жоқ',
}

const property: Messages['property'] = {
  invalid: 'Құнын немесе ауданын санмен енгізіңіз',
  range: 'Аудан, жыл, үлес, айлар немесе коэффициент рұқсат етілген ауқымнан тыс',
  data: 'Осы немесе алдыңғы жылға АЕК жоқ',
}

const inheritance: Messages['inheritance'] = {
  invalid: 'Мүлік құнын санмен енгізіңіз',
  range: 'Мұрагерлер саны немесе құн рұқсат етілген ауқымнан тыс',
}

const pension: Messages['pension'] = {
  invalid: 'Табысты санмен енгізіңіз',
  range:
    'Табыс, еңбек өтілі, жынысы немесе мерзімінен бұрын зейнетақы түрі рұқсат етілген ауқымнан тыс',
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
  data: 'Бұл жылға ең төменгі күнкөріс деңгейі, АЕК немесе ең төменгі зейнетақы жоқ',
}

const customs: Messages['customs'] = {
  invalid: 'Құнды, қозғалтқыш көлемін және еуро бағамын санмен енгізіңіз',
  range: 'Құн, қозғалтқыш көлемі, еуро бағамы немесе шығарылған күні рұқсат етілген ауқымнан тыс',
  date: 'Күн қате, ЖЖЖЖ-АА-КК пішімі күтіледі',
}

export const kk: Messages = {
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
  inheritance,
  pension,
  customs,
}

export {
  alimony as alimonyKk,
  bin as binKk,
  calendar as calendarKk,
  claim as claimKk,
  customs as customsKk,
  date as dateKk,
  deadlines as deadlinesKk,
  family as familyKk,
  iban as ibanKk,
  iin as iinKk,
  inheritance as inheritanceKk,
  leave as leaveKk,
  loan as loanKk,
  money as moneyKk,
  pension as pensionKk,
  phone as phoneKk,
  plate as plateKk,
  property as propertyKk,
  tax as taxKk,
  taxid as taxidKk,
  vehicle as vehicleKk,
}
