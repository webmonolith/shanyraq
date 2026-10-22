import type { ToolProps } from '../ui'
import { LoanTool } from './loan'

export default function Mortgage({ lang }: ToolProps) {
  return <LoanTool lang={lang} mode="mortgage" />
}
