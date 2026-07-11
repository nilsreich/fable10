import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';

const BUDGET = 25600;

const result = await build({
  entryPoints: ['packages/core/src/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  write: false,
  logLevel: 'silent',
});

const minified = result.outputFiles[0].contents;
const gzipped = gzipSync(minified, { level: 9 });
const bytes = gzipped.length;

console.log(
  `@litemath/core: ${(minified.length / 1024).toFixed(2)} KB minified, ` +
    `${(bytes / 1024).toFixed(2)} KB gzip (${bytes} / ${BUDGET} bytes)`
);

if (bytes > BUDGET) {
  console.error(`FAIL: bundle exceeds budget by ${bytes - BUDGET} bytes`);
  process.exit(1);
}
console.log('size check OK');
