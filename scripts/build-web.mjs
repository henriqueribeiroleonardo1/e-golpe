// Empacota o motor em um único arquivo para a demo (public/e-golpe.js).
import { build } from 'esbuild';

await build({
  entryPoints: ['src/web/browser.ts'],
  outfile: 'public/e-golpe.js',
  bundle: true,
  format: 'iife',
  globalName: 'EGolpe',
  target: 'es2023',
  minify: true,
  legalComments: 'none',
});

console.log('public/e-golpe.js gerado');
