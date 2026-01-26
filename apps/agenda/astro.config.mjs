import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'static',

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['local.pulpo.cloud'],
    },
  },

  integrations: [svelte()],

  server: {
    host: "0.0.0.0",
    port: 4321,
  },
});
