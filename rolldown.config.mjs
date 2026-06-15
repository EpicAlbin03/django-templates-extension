import { defineConfig } from 'rolldown';

const externalPrettier = /^prettier($|\/)/;

export default defineConfig([
  {
    input: 'src/index.ts',
    external: [externalPrettier],
    output: {
      file: 'plugin.js',
      format: 'cjs',
      sourcemap: true,
      strict: true,
      esModule: false,
      generatedCode: {
        symbols: false,
      },
    },
  },
  {
    input: 'src/index.ts',
    external: [externalPrettier],
    output: {
      file: 'browser.mjs',
      format: 'esm',
      paths: {
        prettier: 'prettier/standalone',
      },
    },
  },
]);
