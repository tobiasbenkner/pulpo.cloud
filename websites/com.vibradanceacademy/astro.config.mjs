// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    integrations: [icon()],
    vite: {
        plugins: [tailwindcss()]
    },
    i18n: {
        defaultLocale: 'es',
        locales: ['es', 'en', 'de'],
        routing: {
            prefixDefaultLocale: false
        }
    }
});