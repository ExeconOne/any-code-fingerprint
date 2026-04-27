const nodeBuiltins = (id) => id.startsWith('node:');

export default [
  {
    input: 'src/index.js',
    output: [
      { file: 'dist/index.mjs', format: 'es', sourcemap: true },
      { file: 'dist/index.cjs', format: 'cjs', exports: 'named', sourcemap: true }
    ]
  },
  {
    input: 'src/node.js',
    external: nodeBuiltins,
    output: [
      { file: 'dist/node.mjs', format: 'es', sourcemap: true },
      { file: 'dist/node.cjs', format: 'cjs', exports: 'named', sourcemap: true }
    ]
  },
  {
    input: 'src/cli.js',
    external: nodeBuiltins,
    output: [
      {
        file: 'dist/cli.mjs',
        format: 'es',
        sourcemap: true,
        banner: '#!/usr/bin/env node'
      },
      {
        file: 'dist/cli.cjs',
        format: 'cjs',
        exports: 'named',
        sourcemap: true,
        banner: '#!/usr/bin/env node'
      }
    ]
  },
  {
    input: 'src/browser.js',
    output: {
      file: 'dist/index.browser.js',
      format: 'iife',
      name: 'AnyCodeFingerprint',
      sourcemap: true,
      exports: 'named'
    }
  }
];
