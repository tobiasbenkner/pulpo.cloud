import { atom } from "nanostores";
import Big from "big.js";
import { getAuthClient } from "@pulpo/auth";
import { getTaxRulesForPostcode } from "@pulpo/cms";

export const taxRates = atom<Record<string, string>>({});

export const taxLoaded = atom(false);

export async function loadTaxRates(postcode: string) {
  try {
    const client = getAuthClient();
    const rules = await getTaxRulesForPostcode(client as any, postcode);

    if (rules.length > 0) {
      const rates: Record<string, string> = {};
      for (const rule of rules) {
        rates[rule.classCode] = new Big(rule.rate).div(100).toString();
      }
      taxRates.set(rates);
    }

    taxLoaded.set(true);
  } catch (e) {
    console.error("Failed to load tax rates:", e);
    taxLoaded.set(true);
  }
}
