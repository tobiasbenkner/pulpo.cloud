// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import svelte from '@astrojs/svelte';

export default defineConfig({
  site: 'https://holacanterasclub.com',
  image: {
    domains: ['admin.pulpo.cloud'],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [icon(), svelte()],
});