import { DirectusClient, readItems, RestClient } from "@directus/sdk";
import { ReducedTranslations, Schema } from "../types";
import { reduceTranslations } from "../i18n";

export type Contact = {
  id: string;
  sort: number;
  url: string;
  type: string;
  label: ReducedTranslations;
  title: ReducedTranslations;
  subtitle: ReducedTranslations;
  action: ReducedTranslations;
};

export type OpeningHour = {
  id: string;
  days_label: ReducedTranslations;
  additional_info: ReducedTranslations;
  hours_text: ReducedTranslations;
};

export type Tenant = {
  id: string;
  name: string;
  street: string;
  postcode: string;
  city: string;
  maps: string;
  social: {
    instagram: string;
    facebook: string;
    tiktok: string;
    youtube: string;
    tripadvisor: string;
    restaurantguru: string;
    yelp: string;
  };
  opening_hours: OpeningHour[];
  contacts: Contact[];
};

function mapContact(contact: any): Contact {
  return {
    ...contact,
    label: reduceTranslations(contact.translations, "label"),
    title: reduceTranslations(contact.translations, "title"),
    subtitle: reduceTranslations(contact.translations, "subtitle"),
    action: reduceTranslations(contact.translations, "action"),
  } as Contact;
}

function mapOpeningHours(opening_hours: any): OpeningHour {
  return {
    ...opening_hours,
    days_label: reduceTranslations(opening_hours.translations, "days_label"),
    additional_info: reduceTranslations(
      opening_hours.translations,
      "additional_info",
    ),
    hours_text: reduceTranslations(opening_hours.translations, "hours_text"),
  } as OpeningHour;
}

export async function getTenant(
  client: DirectusClient<Schema> & RestClient<Schema>,
  tenantId: string,
) {
  const filter: any = { id: { _eq: tenantId } };

  const response = await client.request(
    readItems("tenants", {
      filter: filter,
      fields: [
        "*",
        "opening_hours.*",
        "opening_hours.translations.*",
        "opening_hours.translations.languages_id.*",
        "contacts.*",
        "contacts.translations.*",
        "contacts.translations.languages_id.*",
      ],
    }),
  );

  if (response.length !== 1) {
    throw new Error(`Cannot find tenant ${tenantId}`);
  }

  const tenant = response[0];
  return {
    ...tenant,
    social: {
      instagram: tenant.instagram,
      facebook: tenant.facebook,
      tiktok: tenant.tiktok,
      youtube: tenant.youtube,
      tripadvisor: tenant.tripadvisor,
      restaurantguru: tenant.restaurantguru,
      yelp: tenant.yelp,
    },
    opening_hours: (tenant.opening_hours ?? []).map(mapOpeningHours),
    contacts: (tenant.contacts ?? []).map(mapContact),
  } as Tenant;
}

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
    return mapOpeningHours(it);
  });
}
