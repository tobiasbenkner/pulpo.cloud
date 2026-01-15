import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['local.pulpo.cloud'],
    },
  },

  adapter: node({
    mode: 'standalone'
  }),

  integrations: [svelte()],

  server: {
    host: "0.0.0.0",
    port: 4321,
  }
});
