import { atom } from "nanostores";
import { getAuthClient } from "@pulpo/auth";
import { getTaxRulesForPostcode } from "@pulpo/cms";

export const taxRates = atom<Record<string, number>>({
  STD: 0.07,
  RED: 0.03,
  INC: 0.095,
  NULL: 0,
  SUPER_RED: 0,
  ZERO: 0,
});

export const taxLoaded = atom(false);

export async function loadTaxRates(postcode: string) {
  try {
    const client = getAuthClient();
    const rules = await getTaxRulesForPostcode(client as any, postcode);

    if (rules.length > 0) {
      const rates: Record<string, number> = {};
      for (const rule of rules) {
        rates[rule.classCode] = rule.rate;
      }
      taxRates.set(rates);
    }

    taxLoaded.set(true);
  } catch (e) {
    console.error("Failed to load tax rates:", e);
    taxLoaded.set(true);
  }
}
