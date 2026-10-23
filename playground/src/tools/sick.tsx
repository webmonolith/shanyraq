import type { ToolProps } from '../ui'
import { LeaveTool } from './leave'

export default function Sick({ lang }: ToolProps) {
  return <LeaveTool lang={lang} kind="sick" />
}
