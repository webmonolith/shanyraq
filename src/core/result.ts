/** Outcome of a parse: either a value or a machine-readable error code. */
export type Result<T, E extends string> = { ok: true; value: T } | { ok: false; error: E }

export const ok = <T>(value: T): { ok: true; value: T } => ({ ok: true, value })

export const err = <E extends string>(error: E): { ok: false; error: E } => ({ ok: false, error })
