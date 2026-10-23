import type { ToolProps } from '../ui'
import { FamilyTool } from './maternity'

export default function Childcare({ lang }: ToolProps) {
  return <FamilyTool lang={lang} kind="childcare" />
}
