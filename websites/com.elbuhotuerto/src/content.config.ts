import { defineCollection, z } from "astro:content";
import { tenant } from "./content/tenant";
import { directus } from "./lib/directus";
import { readItems } from "@directus/sdk";
import { I18nSchema } from "./utils/t";
import { getDefaultLanguage } from "./content/language";
import { navigations } from "./content/navigation";
import { convertI18n, getImage } from "./content/utils";
import { pages } from "./content/pages";
import { TENANT_ID } from "./config";

const categories = defineCollection({
  loader: async () => {
    const tenantId = TENANT_ID;

    if (!tenantId) {
      throw new Error("TENANT_ID environment variable is missing!");
    }

    const defaultLanguage = await getDefaultLanguage(tenantId);

    const response = await directus.request(
      readItems("categories", {
        fields: [
          "*",
          "image.*",
          "translations.*",
          "translations.languages_id.*",
          "products.*",
          "products.translations.*",
          "products.translations.languages_id.*",
          "products.image.*",
        ],
        filter: {
          tenant: {
            _eq: tenantId,
          },
        },
      })
    );

    const categories = response.map((category) => {
      const products = category.products.map((product: any) => {
        return {
          id: product.id,
          sort: product.sort,
          price: product.price,
          image: getImage(product.image),
          allergies: product.allergies ?? [],
          name: convertI18n(product.translations, "name", defaultLanguage.code),
          description: convertI18n(
            product.translations,
            "description",
            defaultLanguage.code
          ),
          note: convertI18n(product.translations, "note", defaultLanguage.code),
          category: product.category,
        };
      });

      return {
        id: category.id,
        name: convertI18n(category.translations, "name", defaultLanguage.code),
        description: convertI18n(
          category.translations,
          "description",
          defaultLanguage.code
        ),
        products: products,
        sort: category.sort,
        image: getImage(category.image),
      };
    });

    return categories;
  },
  schema: ({ image }) =>
    z.object({
      id: z.string(),
      name: I18nSchema,
      description: I18nSchema,
      image: z
        .object({
          src: image(),
          title: z.string().nullable().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          focalPoint: z
            .object({
              x: z.number().nullable().optional(),
              y: z.number().nullable().optional(),
            })
            .optional(),
        })
        .nullable()
        .optional(),
      sort: z.number().nullable().optional(),
      products: z.array(
        z.object({
          id: z.string(),
          name: I18nSchema,
          description: I18nSchema,
          note: I18nSchema,
          price: z.number(),
          image: z
            .object({
              src: image(),
              title: z.string().nullable().optional(),
              width: z.number().optional(),
              height: z.number().optional(),
              focalPoint: z
                .object({
                  x: z.number().nullable().optional(),
                  y: z.number().nullable().optional(),
                })
                .optional(),
            })
            .nullable()
            .optional(),
          allergies: z.array(z.string()),
          category: z.string(),
        })
      ),
    }),
});

const languages = defineCollection({
  loader: async () => {
    const tenantId = TENANT_ID;

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
  schema: z.object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
    flag: z.string(),
  }),
});

export const collections = {
  categories,
  languages,
  pages,
  tenant,
  navigations,
};
