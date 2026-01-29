import { TENANT_ID } from "@/config";
import {
  createClientPublic,
  getCategoriesWithProducts as _getCategoriesWithProducts,
} from "@pulpo/cms";

export const client = createClientPublic();

export function getCategoriesWithProducts() {
  return _getCategoriesWithProducts(client, {
    tenant: TENANT_ID,
  });
}
