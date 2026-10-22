import { useState } from 'react'
import { kk, ru } from 'shanyraq/i18n'
import { type PlateType, parsePlate } from 'shanyraq/plate'
import { getRegion } from 'shanyraq/regions'
import { Check, Field, Rows, Status, type ToolProps } from '../ui'

const EXAMPLES = ['237 BLM 01', '389bk02', 'D123 456', 'H 544 01']

const T = {
  ru: {
    label: 'Госномер',
    strict: 'Строгая проверка (только латиница и написание как на образцах)',
    hint: 'Регистр, пробелы и кириллические буквы-двойники (А, В, Е, К, М, Н, О, Р, С, Т, Х, У) допускаются.',
    examples: 'Примеры:',
    valid: 'Формат номера корректен',
    canonical: 'Написание',
    type: 'Серия',
    region: 'Регион',
    noRegion: 'без кода региона',
    types: {
      individual: 'физическое лицо',
      legalEntity: 'юридическое лицо',
      motorcycle: 'мотоцикл (или прицеп полиции)',
      trailer: 'прицеп',
      transit: 'транзитный',
      police: 'МВД',
      stateGuard: 'Служба государственной охраны',
      protocol: 'протокольный',
      diplomatic: 'дипломатический',
      honoraryConsul: 'почётный консул',
      foreignBranch: 'филиал или представительство иностранного юрлица',
      foreignParticipation: 'организация с иностранным участием',
      foreigner: 'иностранец или лицо без гражданства',
      armenia: 'ввезён из Армении до 01.02.2020',
    },
    messages: ru.plate,
  },
  kk: {
    label: 'Мемлекеттік нөмір',
    strict: 'Қатаң тексеру (тек латын әріптері және үлгідегідей жазылуы)',
    hint: 'Регистр, бос орын және кириллицадағы ұқсас әріптер (А, В, Е, К, М, Н, О, Р, С, Т, Х, У) рұқсат етіледі.',
    examples: 'Мысалдар:',
    valid: 'Нөмір пішімі дұрыс',
    canonical: 'Жазылуы',
    type: 'Серия',
    region: 'Өңір',
    noRegion: 'өңір кодынсыз',
    types: {
      individual: 'жеке тұлға',
      legalEntity: 'заңды тұлға',
      motorcycle: 'мотоцикл (немесе полиция тіркемесі)',
      trailer: 'тіркеме',
      transit: 'транзиттік',
      police: 'ІІМ',
      stateGuard: 'Мемлекеттік күзет қызметі',
      protocol: 'протоколдық',
      diplomatic: 'дипломатиялық',
      honoraryConsul: 'құрметті консул',
      foreignBranch: 'шетелдік заңды тұлғаның филиалы не өкілдігі',
      foreignParticipation: 'шетелдік қатысуы бар ұйым',
      foreigner: 'шетелдік немесе азаматтығы жоқ адам',
      armenia: '01.02.2020 дейін Армениядан әкелінген',
    },
    messages: kk.plate,
  },
} satisfies Record<string, { types: Record<PlateType, string>; [k: string]: unknown }>

export default function Plate({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useState('')
  const [strict, setStrict] = useState(false)
  const r = value.trim() ? parsePlate(value, { strict }) : undefined
  const region = r?.ok && r.value.regionId ? getRegion(r.value.regionId) : undefined
  return (
    <>
      <Field label={t.label} value={value} onChange={setValue} wide />
      <div className="bar">
        <Check label={t.strict} checked={strict} onChange={setStrict} />
        <span className="examples">
          {t.examples}
          {EXAMPLES.map((e) => (
            <button type="button" className="link" key={e} onClick={() => setValue(e)}>
              {e}
            </button>
          ))}
        </span>
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          <Status ok>{t.valid}</Status>
          <Rows
            rows={[
              [t.canonical, <code key="v">{r.value.value}</code>],
              [t.type, t.types[r.value.type]],
              [t.region, region ? `${region.name[lang]} (${r.value.regionCode})` : t.noRegion],
            ]}
          />
        </>
      )}
    </>
  )
}
