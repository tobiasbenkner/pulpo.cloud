// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  base: '/menu',
  integrations: [icon()],
  server: { host: '0.0.0.0', port: 4321 },
  vite: {
    plugins: [tailwindcss()],
  }
});
