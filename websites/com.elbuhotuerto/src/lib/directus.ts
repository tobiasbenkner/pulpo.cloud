import { TENANT_ID } from "@/config";
import {
  createClientPublic,
  getCategoriesWithProducts as _getCategoriesWithProducts,
  getOpeningHours as _getOpeningHours,
} from "@pulpo/cms";

export const client = createClientPublic();

export function getCategoriesWithProducts() {
  return _getCategoriesWithProducts(client, {
    tenant: TENANT_ID,
  });
}

export function getOpeningHours() {
  return _getOpeningHours(client, TENANT_ID);
}
