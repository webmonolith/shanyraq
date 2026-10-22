import { defineConfig } from 'tsup'

const subpaths = [
  'bin',
  'calendar',
  'date',
  'deadlines',
  'faker',
  'i18n',
  'iban',
  'iin',
  'leave',
  'loan',
  'money',
  'phone',
  'plate',
  'regions',
  'tax',
  'taxid',
  'translit',
  'zod',
]

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      ...Object.fromEntries(subpaths.map((p) => [`${p}/index`, `src/${p}/index.ts`])),
    },
    format: ['esm', 'cjs'],
    target: 'es2020',
    platform: 'neutral',
    external: ['zod'],
    dts: true,
    splitting: true,
    treeshake: true,
    clean: true,
  },
  {
    entry: { cli: 'src/cli.ts' },
    format: ['esm'],
    target: 'node18',
    platform: 'node',
    banner: { js: '#!/usr/bin/env node' },
    treeshake: true,
  },
])
