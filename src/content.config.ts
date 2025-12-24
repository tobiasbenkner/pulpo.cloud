import { defineCollection } from "astro:content";
import { CategorySchema } from "./collections/Product";
import { getFileUrl } from "./utils/getFile";
import { TenantSchema } from "./collections/Tenant";
import { directus } from "./lib/directus";
import { readItem, readItems } from "@directus/sdk";
import { LanguageSchema } from "./collections/Language";

const categories = defineCollection({
  loader: async () => {
    const response = await fetch(
      `https://pulpo.cloud/api/collections/categories/records?expand=products_via_category&sort=sort`,
      {
        headers: {
          tenant: "mffp8qnmsnzuubx",
        },
      }
    );
    const json = await response.json();

    return json.items.map((category: any) => {
      return {
        ...category,
        photo: getFileUrl(category.id, category.photo, "categories"),
        products: (category.expand?.products_via_category ?? []).map(
          (product: any) => {
            return {
              ...product,
              photo: getFileUrl(product.id, product.photo, "products"),
            };
          }
        ),
      };
    });
  },
  schema: CategorySchema,
});

const tenant = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }
    const tenant = await directus.request(readItem("tenants", tenantId));
    return [
      {
        ...tenant,
        id: "main",
      },
    ];
  },
  schema: TenantSchema,
});

const languages = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }
    const languages = await directus.request(
      readItems("languages", {
        sort: ["sort"],
        filter: {
          tenant: {
            _eq: tenantId,
          },
        },
      })
    );

    return languages.map((lang) => ({
      ...lang,
      id: lang.id,
    }));
  },
  schema: LanguageSchema,
});

export const collections = { categories, languages, tenant };
