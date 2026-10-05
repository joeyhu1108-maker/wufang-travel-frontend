import {defineConfig} from 'vite';
import {guardedPublicCopy} from './scripts/guarded-public-copy.mjs';

export default defineConfig({
  base: './',
  plugins: [guardedPublicCopy()],
  optimizeDeps: {exclude: ['maplibre-gl']},
  build: {assetsInlineLimit: 0, rollupOptions: {input: {main: 'index.html', field: 'explore-field/index.html'}}},
});
