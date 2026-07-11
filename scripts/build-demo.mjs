import { build } from 'esbuild';
import { cpSync, mkdirSync } from 'node:fs';

// Baut das Demo als self-contained statische App nach dist/ (deploybar z. B. auf Vercel).
mkdirSync('dist', { recursive: true });

await build({
  entryPoints: ['packages/core/src/index.ts'],
  bundle: true,
  minify: true,
  format: 'esm',
  outfile: 'dist/lmi.js',
  logLevel: 'info',
});

for (const [from, to] of [
  ['demo/index.html', 'dist/index.html'],
  ['demo/main.js', 'dist/main.js'],
  ['demo/dark.css', 'dist/dark.css'],
  ['packages/core/theme.css', 'dist/theme.css'],
]) {
  cpSync(from, to);
}

console.log('demo built to dist/');
