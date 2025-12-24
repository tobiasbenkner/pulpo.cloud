import { z } from "astro/zod";

const SOCIAL_KEYS = [
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "whatsapp",
  "tripadvisor",
  "yelp",
  "restaurantguru",
] as const;

export const TenantSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    street: z.string().optional(),
    postcode: z.string().optional(),
    city: z.string().optional(),
    maps: z.string().optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    facebook: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
    tripadvisor: z.string().optional(),
    yelp: z.string().optional(),
    restaurantguru: z.string().optional(),
    tiktok: z.string().optional(),
  })
  .transform((data) => {
    const social_links = SOCIAL_KEYS.filter((key) => data[key]).map((key) => ({
      name: key,
      url: data[key] as string,
    }));

    return {
      ...data,
      social_links,
    };
  });

export type Tenant = z.infer<typeof TenantSchema>;
