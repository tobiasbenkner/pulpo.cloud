// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import 'dotenv/config';
import icon from "astro-icon";


export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',

  image: {
    domains: ['admin.pulpo.cloud'],
  },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    icon()
  ]
});