import { ReducedTranslations } from "../i18n";

export interface Event {
  id: string;
  date: string;
  time: string;
  price: number;
  image: string;
  title: ReducedTranslations;
  description: ReducedTranslations;
  slug: ReducedTranslations;
  seo_title: ReducedTranslations;
  seo_description: ReducedTranslations;
}
