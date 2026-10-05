import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// The production build is ONE self-contained index.html (JS, CSS and fonts inlined),
// so it opens straight from disk in Chrome (file://), from a USB stick on the board,
// or from any static web server.
export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  // The web bundle's own version, used by the in-app updater.
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Keep file paths as given instead of resolving them to their "real" location. Windows
  // redirects some AppData folders (e.g. for packaged apps) to a path the dev server
  // cannot read, which made the dev server serve untransformed source.
  resolve: { preserveSymlinks: true },
  build: {
    target: ['chrome80', 'edge80', 'safari13'],
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
  server: { port: 5173 },
});
