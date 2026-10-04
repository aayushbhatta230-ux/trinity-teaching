import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The production build is ONE self-contained index.html (JS, CSS and fonts inlined),
// so it opens straight from disk in Chrome (file://), from a USB stick on the board,
// or from any static web server.
export default defineConfig({
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  base: './',
  build: {
    target: ['chrome80', 'edge80', 'safari13'],
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
  server: { port: 5173 },
});
