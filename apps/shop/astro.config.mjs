// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import 'dotenv/config';

export default defineConfig({

  vite: {
    plugins: [tailwindcss()]
  },
});