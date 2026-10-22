import { useState } from 'react'
import type { DivisionType, EntityType } from 'shanyraq/bin'
import { createFaker } from 'shanyraq/faker'
import { kk, ru } from 'shanyraq/i18n'
import { parseTaxId } from 'shanyraq/taxid'
import { Check, Field, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const fake = createFaker(2026)
const EXAMPLES = [fake.iin(), fake.bin()]

const T = {
  ru: {
    label: 'ИИН или БИН',
    placeholder: '12 цифр',
    strict: 'Строгая проверка (без пробелов, структура по правилам)',
    hint: 'Введите 12 цифр. Пробелы и дефисы допускаются.',
    examples: 'Примеры:',
    iin: 'Это корректный ИИН',
    bin: 'Это корректный БИН',
    birthDate: 'Дата рождения',
    gender: 'Пол',
    genders: { male: 'мужской', female: 'женский' },
    century: 'Век рождения',
    unknown: 'не закодировано в номере',
    registered: 'Месяц и год регистрации',
    month: (mm: string, yy: string) => `месяц ${mm}, год …${yy} (век в БИН не кодируется)`,
    entity: 'Тип (5-я цифра)',
    division: 'Признак (6-я цифра)',
    serial: 'Порядковый номер',
    entities: {
      resident: 'юридическое лицо — резидент',
      nonResident: 'юридическое лицо — нерезидент',
      jointEntrepreneur: 'ИП на основе совместного предпринимательства',
      reserved: 'зарезервированный код',
    },
    divisions: {
      head: 'головное подразделение',
      branch: 'филиал',
      representative: 'представительство',
      farm: 'крестьянское (фермерское) хозяйство',
    },
    messages: ru.taxid,
  },
  kk: {
    label: 'ЖСН немесе БСН',
    placeholder: '12 цифр',
    strict: 'Қатаң тексеру (бос орынсыз, қағида бойынша құрылым)',
    hint: '12 цифр енгізіңіз. Бос орын мен сызықшаға рұқсат етіледі.',
    examples: 'Мысалдар:',
    iin: 'Бұл дұрыс ЖСН',
    bin: 'Бұл дұрыс БСН',
    birthDate: 'Туған күні',
    gender: 'Жынысы',
    genders: { male: 'ер', female: 'әйел' },
    century: 'Туған ғасыры',
    unknown: 'нөмірде кодталмаған',
    registered: 'Тіркелген айы мен жылы',
    month: (mm: string, yy: string) => `${mm}-ай, …${yy} жыл (ғасыр БСН-де кодталмайды)`,
    entity: 'Түрі (5-цифр)',
    division: 'Белгісі (6-цифр)',
    serial: 'Реттік нөмір',
    entities: {
      resident: 'заңды тұлға — резидент',
      nonResident: 'заңды тұлға — бейрезидент',
      jointEntrepreneur: 'бірлескен кәсіпкерлік негізіндегі ЖК',
      reserved: 'резервтегі код',
    },
    divisions: {
      head: 'бас бөлімше',
      branch: 'филиал',
      representative: 'өкілдік',
      farm: 'шаруа (фермер) қожалығы',
    },
    messages: kk.taxid,
  },
} satisfies Record<
  string,
  {
    entities: Record<EntityType, string>
    divisions: Record<DivisionType, string>
    [k: string]: unknown
  }
>

const CENTURY = { 19: 'XIX', 20: 'XX', 21: 'XXI' } as const

export default function Iin({ lang }: ToolProps) {
  const t = T[lang]
  const [value, setValue] = useQuery('q')
  const [strict, setStrict] = useState(false)
  const r = value.trim() ? parseTaxId(value, { strict }) : undefined
  return (
    <>
      <Field
        label={t.label}
        value={value}
        onChange={setValue}
        placeholder={t.placeholder}
        inputMode="numeric"
        wide
      />
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
        {value.trim() && <Share lang={lang} />}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : r.value.kind === 'iin' ? (
        <>
          <Status ok>{t.iin}</Status>
          <Rows
            lang={lang}
            rows={[
              [t.birthDate, r.value.birthDate ?? t.unknown],
              [t.gender, r.value.gender ? t.genders[r.value.gender] : t.unknown],
              [t.century, r.value.century ? CENTURY[r.value.century] : t.unknown],
            ]}
          />
        </>
      ) : (
        <>
          <Status ok>{t.bin}</Status>
          <Rows
            lang={lang}
            rows={[
              [
                t.registered,
                r.value.registered
                  ? t.month(
                      String(r.value.registered.month).padStart(2, '0'),
                      String(r.value.registered.yy).padStart(2, '0'),
                    )
                  : t.unknown,
              ],
              [t.entity, t.entities[r.value.entityType]],
              [t.division, r.value.divisionType ? t.divisions[r.value.divisionType] : t.unknown],
              [t.serial, r.value.serial],
            ]}
          />
        </>
      )}
    </>
  )
}
