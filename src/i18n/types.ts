import type { ErrorCodes } from '../core/errors'

export type Lang = 'ru' | 'kk' | 'en'

export type Messages = { [M in keyof ErrorCodes]: Record<ErrorCodes[M], string> }
