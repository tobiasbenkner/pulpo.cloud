import { atom } from "nanostores";
import { getAuthClient } from "@pulpo/auth";
import { getTaxRulesForPostcode } from "@pulpo/cms";

export const taxRates = atom<Record<string, string>>({});

export const taxLoaded = atom(false);

/** Tax system name derived from postcode: IGIC (Canary Islands) or IVA (mainland) */
export const taxName = atom("IGIC");

function resolveTaxName(postcode: string): string {
  const prefix = postcode.slice(0, 2);
  if (prefix === "35" || prefix === "38") return "IGIC";
  if (prefix === "51" || prefix === "52") return "IPSI";
  return "IVA";
}

export async function loadTaxRates(postcode: string) {
  taxName.set(resolveTaxName(postcode));

  try {
    const client = getAuthClient();
    const rules = await getTaxRulesForPostcode(client as any, postcode);

    if (rules.length > 0) {
      const rates: Record<string, string> = {};
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
