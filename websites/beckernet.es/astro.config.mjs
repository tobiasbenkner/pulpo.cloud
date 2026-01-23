// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://www.beckernet.es',
  image: {
    domains: ['admin.pulpo.cloud'],
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [icon()],
});