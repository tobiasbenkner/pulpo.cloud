export const languages = ['es', 'de', 'en'] as const;
export const defaultLang = 'es' as const;

export type Language = typeof languages[number];

export type RouteDefinition = {
  key: string;
  slugs: { [key in Language]: string };
};

export interface BaseTranslations {
  seo: {
    title: string;
    description: string;
  };
}