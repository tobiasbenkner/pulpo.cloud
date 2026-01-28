// Types
export type {
  FlattenTranslation,
  RouteDefinition,
  I18n,
  RouteModules,
  TranslationModules,
  PageModules,
} from "./types";
export { I18nSchema } from "./types";

// Resolver for static translations (Beckernet pattern)
export { createResolver } from "./resolve";
export type { ResolveOptions } from "./resolve";

// Translation function for CMS i18n (El Buho pattern)
export { t } from "./t";

// Registry for view-based routing
export { createRegistry } from "./registry";
export type { RegistryOptions, Registry } from "./registry";

// Locale helpers
export { openGraphLocales, getOpenGraphLocale } from "./locales";
