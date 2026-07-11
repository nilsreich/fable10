import { build } from 'esbuild';

await build({
  entryPoints: ['packages/core/src/index.ts'],
  bundle: true,
  format: 'esm',
  outfile: 'demo/lmi.js',
  logLevel: 'info',
});
