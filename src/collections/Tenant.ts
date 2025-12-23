import { z } from "astro/zod";

export const TenantSchema = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  phone: z.string(),
  whatsapp: z.string(),
  social: z.object({
    facebook: z.string(),
    instagram: z.string(),
    youtube: z.string(),
    tripadvisor: z.string(),
    yelp: z.string(),
    restaurantguru: z.string(),
  }),
});

export type Tenant = z.infer<typeof TenantSchema>;
