import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';

export default defineConfig({
  base: '/apps',
  output: 'static',
  server: { host: '0.0.0.0', port: 4325 },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [svelte()],
});
