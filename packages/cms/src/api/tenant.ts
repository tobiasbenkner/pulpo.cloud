import { DirectusClient, readItems, RestClient } from "@directus/sdk";
import { ReducedTranslations, Schema } from "../types";
import { reduceTranslations } from "../i18n";

export type OpeningHour = {
  id: string;
  days_label: ReducedTranslations;
  additional_info: ReducedTranslations;
  hours_text: ReducedTranslations;
};

export async function getOpeningHours(
  client: DirectusClient<Schema> & RestClient<Schema>,
  tenantId: string,
) {
  const filter: any = { tenant: { _eq: tenantId } };

  const response = await client.request(
    readItems("opening_hours", {
      filter: filter,
      sort: ["sort"],
      fields: ["*", "translations.*", "translations.languages_id.*"],
    }),
  );

  return response.map((it) => {
    return {
      ...it,
      days_label: reduceTranslations(it.translations, "days_label"),
      additional_info: reduceTranslations(it.translations, "additional_info"),
      hours_text: reduceTranslations(it.translations, "hours_text"),
    } as OpeningHour;
  });
}
