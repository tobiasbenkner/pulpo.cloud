// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import 'dotenv/config';
import icon from "astro-icon";


import sitemap from '@astrojs/sitemap';


export default defineConfig({
  site: process.env.SITE_URL || 'http://localhost:4321',

  image: {
    domains: ['admin.pulpo.cloud'],
  },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    icon(),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es',
          "es-ar": 'es-ar',
          en: 'en',
          de: 'de',
        },
      },
    })
  ]
});