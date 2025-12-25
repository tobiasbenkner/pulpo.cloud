import { defineCollection, z } from "astro:content";
import { TenantSchema } from "./collections/Tenant";
import { directus } from "./lib/directus";
import { readItem, readItems } from "@directus/sdk";
import { LanguageSchema } from "./collections/Language";
import { getDefaultLanguage } from "./utils/getDefaultLangauge";
import { I18nSchema } from "./utils/t";

function convertI18n(trans: any[], fieldName: string, defaultLanguage: string) {
  const translations = (trans ?? []).reduce((acc: any, trans: any) => {
    acc[trans.languages_id.code] = trans?.[fieldName] ?? "";
    return acc;
  }, {} as Record<string, string>);

  return {
    value: translations[defaultLanguage],
    translations: translations,
  };
}

function getImage(image: any) {
  let photoData = null;
  if (image && typeof image === "object") {
    const filename = image.filename_disk || "image.jpg";

    photoData = {
      src: `${import.meta.env.DIRECTUS_URL}/assets/${
        image.id
      }/${filename}?access_token=${
        import.meta.env.DIRECTUS_TOKEN
      }&width=1500&withoutEnlargement=true`,
      title: image.title,
      width: image.width,
      height: image.height,
      focalPoint: {
        x: image.focal_point_x,
        y: image.focal_point_y,
      },
    };
  }
  return photoData;
}

const categories = defineCollection({
  loader: async () => {
    const tenantId = import.meta.env.TENANT_ID;

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
          allergies: [],
          name: convertI18n(product.translations, "name", defaultLanguage.code),
          description: convertI18n(
            product.translations,
            "description",
            defaultLanguage.code
          ),
          note: [],
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
          note: z.array(z.string()),
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
