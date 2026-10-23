/** Own key of a data table, so `'toString'` or `'constructor'` from untyped callers never resolve. */
export const own = (table: object, key: PropertyKey): boolean =>
  // biome-ignore lint/suspicious/noPrototypeBuiltins: Object.hasOwn is ES2022, the build targets ES2020
  Object.prototype.hasOwnProperty.call(table, key)
