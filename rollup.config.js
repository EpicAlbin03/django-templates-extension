import alias from '@rollup/plugin-alias';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'src/index.ts',
    plugins: [resolve(), commonjs(), typescript()],
    external: [/^prettier($|\/)/],
    output: {
      file: 'plugin.js',
      format: 'cjs',
      sourcemap: true,
    },
  },
  {
    input: 'src/index.ts',
    plugins: [
      alias({
        entries: [{ find: 'prettier', replacement: 'prettier/standalone' }],
      }),
      resolve(),
      commonjs(),
      typescript(),
    ],
    external: ['prettier/standalone', 'prettier/plugins/html'],
    output: {
      file: 'browser.js',
      format: 'esm',
    },
  },
];
