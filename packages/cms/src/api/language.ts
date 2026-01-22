import { DirectusClient, readItems, RestClient } from "@directus/sdk";
import { Schema } from "../types";

export async function getLanguages(
  client: DirectusClient<Schema> & RestClient<Schema>,
  tenant: string,
) {
  const result = await client.request(
    readItems("languages", {
      filter: {
        _and: [{ tenant: { _eq: tenant } }],
      },
      fields: ["*"],
    }),
  );

  return result;
}
