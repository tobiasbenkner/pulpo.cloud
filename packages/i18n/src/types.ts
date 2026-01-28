import { z } from "zod";

/**
 * TypeScript Helper:
 * Transforms nested translation definition structure to flat object for components.
 *
 * Example:
 * Input:  { seo: { title: { es: string, de: string } } }
 * Output: { seo: { title: string } }
 *
 * Also preserves value types (arrays, etc.):
 * Input:  { items: { es: string[], de: string[] } }
 * Output: { items: string[] }
 */
export type FlattenTranslation<T, L extends string = string> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? keyof T[K] extends string
      ? Extract<keyof T[K], L> extends never
        ? FlattenTranslation<T[K], L>
        : T[K][keyof T[K]] // Extract actual value type (string, string[], etc.)
      : never
    : T[K];
};

/**
 * Route definition for multi-language routing
 */
export type RouteDefinition<L extends string = string> = {
  key: string;
  slugs: Record<L, string>;
};

/**
 * Zod schema for CMS i18n objects
 */
export const I18nSchema = z.object({
  value: z.string().nullable().optional(),
  translations: z.record(z.string(), z.string()).optional(),
});

export type I18n = z.infer<typeof I18nSchema>;

/**
 * Type for import.meta.glob route modules
 * Usage: const routeModules: RouteModules<Language> = import.meta.glob("...", { eager: true });
 */
export type RouteModules<L extends string = string> = Record<
  string,
  { route: RouteDefinition<L> }
>;

/**
 * Type for import.meta.glob translation modules
 * Usage: const translationModules: TranslationModules = import.meta.glob("...", { eager: true });
 */
export type TranslationModules = Record<string, { translations: any }>;

/**
 * Type for import.meta.glob page modules
 * Usage: const pageModules: PageModules = import.meta.glob("...", { eager: true });
 */
export type PageModules = Record<string, { default: any }>;
