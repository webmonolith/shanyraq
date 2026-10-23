import { alimony, alimonyPenalty } from 'shanyraq/alimony'
import { kk, ru } from 'shanyraq/i18n'
import { getTaxYear } from 'shanyraq/tax'
import { Choice, Field, fmt, Rows, Share, Status, type ToolProps, useQuery } from '../ui'

const YEAR = getTaxYear() as { year: number; mrp: number }

// TODO(verify): kk texts need native review.
const T = {
  ru: {
    kind: 'Что считаем',
    kinds: [
      ['monthly', 'алименты в месяц'],
      ['penalty', 'неустойку за просрочку'],
    ] as const,
    children: 'Размер',
    shares: [
      ['1', '1 ребёнок — 1/4'],
      ['2', '2 детей — 1/3'],
      ['3', '3 и более — 1/2'],
      ['0', 'только твёрдая сумма'],
      ['custom', 'доля по решению суда'],
    ] as const,
    percent: 'Доля по решению суда, %',
    basis: 'Доход указан',
    bases: [
      ['gross', 'оклад до налогов'],
      ['net', 'на руки'],
    ] as const,
    income: 'Доход в месяц, ₸',
    mrp: `Твёрдая сумма, МРП (1 МРП = ${fmt(YEAR.mrp)} ₸)`,
    mrpHint: 'пусто — без твёрдой суммы',
    amount: 'Удерживается в месяц',
    kept: 'Остаётся плательщику',
    base: 'Доход для удержания (на руки)',
    byShare: (p: number) => `По доле ${fmt(p, 2)} %`,
    fixed: 'Твёрдая сумма',
    capped:
      'Удержание ограничено половиной дохода (закон об исполнительном производстве, ст. 95); остаток копится как задолженность.',
    debt: 'Сумма невыплаченных алиментов, ₸',
    due: 'Срок уплаты',
    paid: 'Дата уплаты',
    days: 'Дней просрочки',
    penalty: 'Неустойка (0,1 % в день)',
    total: 'Долг с неустойкой',
    hint: 'Введите сумму, например 300 000.',
    note: 'Доля считается от заработка после ОПВ, ВОСМС и ИПН. Суд может изменить долю (ст. 139 п. 2).',
    notePenalty: 'Неустойка платится, если долг возник по вине плательщика (ст. 171).',
    messages: ru.alimony,
  },
  kk: {
    kind: 'Не есептейміз',
    kinds: [
      ['monthly', 'айлық алимент'],
      ['penalty', 'мерзімін өткізгені үшін тұрақсыздық айыбы'],
    ] as const,
    children: 'Мөлшері',
    shares: [
      ['1', '1 бала — 1/4'],
      ['2', '2 бала — 1/3'],
      ['3', '3 және одан көп — 1/2'],
      ['0', 'тек тұрақты сома'],
      ['custom', 'сот шешімі бойынша үлес'],
    ] as const,
    percent: 'Сот шешімі бойынша үлес, %',
    basis: 'Табыс көрсетілген',
    bases: [
      ['gross', 'салыққа дейінгі жалақы'],
      ['net', 'қолға алатын'],
    ] as const,
    income: 'Айлық табыс, ₸',
    mrp: `Тұрақты сома, АЕК (1 АЕК = ${fmt(YEAR.mrp)} ₸)`,
    mrpHint: 'бос — тұрақты сомасыз',
    amount: 'Айына ұсталады',
    kept: 'Төлеушіде қалады',
    base: 'Ұстап қалу табысы (қолға)',
    byShare: (p: number) => `${fmt(p, 2)} % үлес бойынша`,
    fixed: 'Тұрақты сома',
    capped:
      'Ұстап қалу табыстың жартысымен шектелді (атқарушылық іс жүргізу туралы заң, 95-бап); қалғаны берешек болып жиналады.',
    debt: 'Төленбеген алимент сомасы, ₸',
    due: 'Төлеу мерзімі',
    paid: 'Төленген күні',
    days: 'Кешіктірілген күндер',
    penalty: 'Тұрақсыздық айыбы (күніне 0,1 %)',
    total: 'Айыппен бірге берешек',
    hint: 'Соманы енгізіңіз, мысалы 300 000.',
    note: 'Үлес МЗЖ, МӘМСҚ жарнасы және ЖТС ұсталғаннан кейінгі жалақыдан есептеледі. Сот үлесті өзгерте алады (139-бап 2-т.).',
    notePenalty: 'Берешек төлеушінің кінәсінен туындаса, тұрақсыздық айыбы төленеді (171-бап).',
    messages: kk.alimony,
  },
}

const num = (s: string) => Number(s.replace(/[\s ]/g, '').replace(',', '.'))

export default function Alimony({ lang }: ToolProps) {
  const t = T[lang]
  const [kindQ, setKind] = useQuery('kind', 'monthly')
  const kind = kindQ === 'penalty' ? 'penalty' : 'monthly'
  const [shareQ, setShare] = useQuery('n', '1')
  const share = t.shares.some(([k]) => k === shareQ)
    ? (shareQ as (typeof t.shares)[number][0])
    : '1'
  const [basisQ, setBasis] = useQuery('basis', 'gross')
  const basis = basisQ === 'net' ? 'net' : 'gross'
  const [value, setValue] = useQuery('q', '300000')
  const [percent, setPercent] = useQuery('p', '25')
  const [mrp, setMrp] = useQuery('mrp', '')
  const [debt, setDebt] = useQuery('debt', '100000')
  const [due, setDue] = useQuery('due', '2026-01-31')
  const [paid, setPaid] = useQuery('paid', '2026-03-02')

  const monthly =
    kind === 'monthly' && value.trim()
      ? alimony(value, {
          gross: basis === 'gross',
          ...(share === 'custom' ? { percent: num(percent) } : { children: Number(share) }),
          ...(mrp.trim() ? { mrp: num(mrp) } : {}),
        })
      : undefined
  const late = kind === 'penalty' && debt.trim() ? alimonyPenalty(debt, due, paid) : undefined
  const r = monthly ?? late

  return (
    <>
      <div className="grid">
        <Choice label={t.kind} value={kind} options={t.kinds} onChange={setKind} />
        {kind === 'monthly' ? (
          <>
            <Choice label={t.children} value={share} options={t.shares} onChange={setShare} />
            {share === 'custom' && (
              <Field label={t.percent} value={percent} onChange={setPercent} inputMode="decimal" />
            )}
            <Choice label={t.basis} value={basis} options={t.bases} onChange={setBasis} />
            <Field label={t.income} value={value} onChange={setValue} inputMode="decimal" />
            <Field
              label={t.mrp}
              value={mrp}
              onChange={setMrp}
              placeholder={t.mrpHint}
              inputMode="decimal"
            />
          </>
        ) : (
          <>
            <Field label={t.debt} value={debt} onChange={setDebt} inputMode="decimal" />
            <Field label={t.due} value={due} onChange={setDue} type="date" />
            <Field label={t.paid} value={paid} onChange={setPaid} type="date" />
          </>
        )}
      </div>
      {!r ? (
        <Status>{t.hint}</Status>
      ) : !r.ok ? (
        <Status ok={false}>{t.messages[r.error]}</Status>
      ) : (
        <>
          {monthly?.ok && (
            <>
              <div className="result">
                <div>
                  <small>{t.amount}</small>
                  <b>{fmt(monthly.value.amount, 2)} ₸</b>
                </div>
                <div>
                  <small>{t.kept}</small>
                  <b>{fmt(monthly.value.kept, 2)} ₸</b>
                </div>
              </div>
              {monthly.value.capped && <Status ok={false}>{t.capped}</Status>}
              <Rows
                lang={lang}
                rows={[
                  [t.base, `${fmt(monthly.value.base, 2)} ₸`],
                  ...(monthly.value.percent
                    ? ([
                        [t.byShare(monthly.value.percent), `${fmt(monthly.value.byShare, 2)} ₸`],
                      ] as [string, string][])
                    : []),
                  ...(monthly.value.fixed
                    ? ([[t.fixed, `${fmt(monthly.value.fixed, 2)} ₸`]] as [string, string][])
                    : []),
                ]}
              />
              <p className="note">{t.note}</p>
            </>
          )}
          {late?.ok && (
            <>
              <div className="result">
                <div>
                  <small>{t.penalty}</small>
                  <b>{fmt(late.value.penalty, 2)} ₸</b>
                </div>
                <div>
                  <small>{t.days}</small>
                  <b>{late.value.days}</b>
                </div>
              </div>
              <Rows lang={lang} rows={[[t.total, `${fmt(num(debt) + late.value.penalty, 2)} ₸`]]} />
              <p className="note">{t.notePenalty}</p>
            </>
          )}
          <div className="bar">
            <Share lang={lang} />
          </div>
        </>
      )}
    </>
  )
}
