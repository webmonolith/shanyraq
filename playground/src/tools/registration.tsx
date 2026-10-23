import type { ToolProps } from '../ui'
import { VehicleTool } from './vehicle'

export default function Registration({ lang }: ToolProps) {
  return <VehicleTool lang={lang} mode="register" />
}
