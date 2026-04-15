// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

export default defineConfig({
  base: '/admin',
  integrations: [icon()],
  server: { host: '0.0.0.0', port: 4322 },
  vite: {
    plugins: [tailwindcss()],
  }
});
