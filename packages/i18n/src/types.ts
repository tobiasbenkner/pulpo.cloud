import { z } from "zod";

/**
 * TypeScript Helper:
 * Transforms nested translation definition structure to flat object for components.
 *
 * Example:
 * Input:  { seo: { title: { es: string, de: string } } }
 * Output: { seo: { title: string } }
 */
export type FlattenTranslation<T, L extends string = string> = {
  [K in keyof T]: T[K] extends Record<string, any>
    ? keyof T[K] extends string
      ? Extract<keyof T[K], L> extends never
        ? FlattenTranslation<T[K], L>
        : string
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
