import { readItems, type DirectusClient, type RestClient } from "@directus/sdk";
import type { Schema, TaxZone, TaxClass } from "../types";

type Client = DirectusClient<Schema> & RestClient<Schema>;

export interface TaxRuleResult {
  classCode: string;
  rate: string;
  surcharge: string;
}

export async function getTaxRulesForPostcode(
  client: Client,
  postcode: string,
): Promise<TaxRuleResult[]> {
  const zones = await client.request(
    readItems("tax_zones", {
      sort: ["priority"],
    }),
  );

  const matchedZone = zones.find((zone: TaxZone) => {
    if (!zone.regex) return false;
    return new RegExp(zone.regex).test(postcode);
  });

  if (!matchedZone) return [];

  const rules = await client.request(
    readItems("tax_rules", {
      filter: { tax_zone_id: { _eq: matchedZone.id } },
      fields: ["*", { tax_class_id: ["*"] }],
    }),
  );

  return rules.map((rule) => {
    const taxClass = rule.tax_class_id as TaxClass;
    return {
      classCode: taxClass.code,
      rate: rule.rate ?? "0",
      surcharge: rule.surcharge ?? "0",
    };
  });
}
