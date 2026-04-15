// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';
import path from 'node:path';

export default defineConfig({
  base: '/shop',
  server: { host: '0.0.0.0', port: 4323 },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '$lib': path.resolve('./src/lib'),
      }
    }
  },
  integrations: [svelte()],
});