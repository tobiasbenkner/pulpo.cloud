import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'static',
  base: '/agenda',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [svelte()],

  server: {
    host: "0.0.0.0",
    port: 4324,
  },
});
