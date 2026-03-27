// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: {
        es: 'Documentación',
        de: 'Dokumentation',
        en: 'Documentation',
        it: 'Documentazione',
      },
      logo: {
        src: './src/assets/logo.png',
        alt: 'Pulpo',
      },
      favicon: '/favicon.png',
      customCss: ['./src/styles/custom.css'],
      disable404Route: false,
      components: {
        ThemeSelect: './src/components/ThemeSelect.astro',
        ThemeProvider: './src/components/ThemeProvider.astro',
      },
      defaultLocale: 'root',
      locales: {
        root: { label: 'Español', lang: 'es' },
        de: { label: 'Deutsch' },
        en: { label: 'English' },
        it: { label: 'Italiano' },
      },
      sidebar: [
        {
          label: 'Procesos',
          translations: { de: 'Prozesse', en: 'Processes', it: 'Processi' },
          autogenerate: { directory: '/' },
        },
      ],
    }),
  ],
});
