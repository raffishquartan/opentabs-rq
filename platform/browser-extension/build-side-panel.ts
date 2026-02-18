/**
 * Build script for the side panel React app.
 * Uses Bun.build to bundle React + JSX into a single file for the Chrome extension.
 */

import { join } from 'node:path';

const base = import.meta.dirname;

const result = await Bun.build({
  entrypoints: [join(base, 'src/side-panel/index.tsx')],
  outdir: join(base, 'dist/side-panel'),
  naming: 'side-panel.js',
  target: 'browser',
  format: 'esm',
  minify: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});

if (!result.success) {
  console.error('[opentabs:build:side-panel] Build failed:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log('[opentabs:build:side-panel] Built successfully');
