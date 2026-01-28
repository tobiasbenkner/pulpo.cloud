import type { Language } from "./i18n";

export type RouteDefinition = {
  key: string;
  slugs: { [key in Language]: string };
};
