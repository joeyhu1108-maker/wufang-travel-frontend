import {defineConfig} from 'vite';

export default defineConfig({
  base: './',
  optimizeDeps: {exclude: ['maplibre-gl']},
  build: {assetsInlineLimit: 0, rollupOptions: {input: {main: 'index.html', field: 'explore-field/index.html'}}},
});
