import { DirectusClient, readItems, RestClient } from "@directus/sdk";
import { Schema } from "../types";
import { reduceTranslations } from "../i18n";
import { Event } from "../types/event";

export async function getEvents(
  client: DirectusClient<Schema> & RestClient<Schema>,
  query?: { tenant: string; date?: string },
) {
  const filter: any = {};

  if (query?.tenant) {
    filter.tenant = { _eq: query.tenant };
  }

  if (query?.date) {
    filter.date = { _gt: query.date };
  }

  const events = await client.request(
    readItems("events", {
      filter: filter,
      sort: ["-date"],
      fields: ["*", "image.*", "translations.*", "translations.languages_id.*"],
    }),
  );

  return events.map((event) => {
    return {
      ...event,
      slug: reduceTranslations(event.translations, "slug"),
      title: reduceTranslations(event.translations, "title"),
      description: reduceTranslations(event.translations, "content"),
      seo_title: reduceTranslations(event.translations, "seo.title"),
      seo_description: reduceTranslations(
        event.translations,
        "seo.meta_description",
      ),
    } as Event;
  });
}
