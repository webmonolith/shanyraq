import { useState } from 'react'
import { toLatin } from 'shanyraq/translit'
import { Output, type ToolProps } from '../ui'

const T = {
  ru: {
    input: 'Текст на кириллице',
    s2021: 'Проект 2021 года (Ä, Ğ, İ/ı, Ñ, Ö, Ş, Ū, Ü)',
    s2018: 'Указ № 637 от 19.02.2018 (акуты: Á, Ǵ, Ń, Ó, Ú, Ý)',
  },
  kk: {
    input: 'Кириллицадағы мәтін',
    s2021: '2021 жылғы жоба (Ä, Ğ, İ/ı, Ñ, Ö, Ş, Ū, Ü)',
    s2018: '2018 жылғы 19 ақпандағы № 637 Жарлық (акуттар: Á, Ǵ, Ń, Ó, Ú, Ý)',
  },
}

export default function Translit({ lang }: ToolProps) {
  const t = T[lang]
  const [text, setText] = useState('Қазақстан Республикасы — тәуелсіз мемлекет.')
  return (
    <>
      <label className="field wide">
        <span>{t.input}</span>
        <textarea
          rows={4}
          value={text}
          spellCheck={false}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <h3>{t.s2021}</h3>
      <Output text={toLatin(text)} lang={lang} />
      <h3>{t.s2018}</h3>
      <Output text={toLatin(text, { scheme: '2018' })} lang={lang} />
    </>
  )
}
