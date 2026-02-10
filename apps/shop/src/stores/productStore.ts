import { atom } from "nanostores";
import { getAuthClient, getStoredToken } from "@pulpo/auth";
import { getCategoriesWithProducts, imageUrl } from "@pulpo/cms";
import type { ProductCategory as CmsCategory } from "@pulpo/cms";
import type { Product } from "../types/shop";

export interface ShopCategory {
  id: string;
  name: string;
  products: Product[];
}

export const categories = atom<ShopCategory[]>([]);
export const isLoading = atom(false);
export const error = atom<string | null>(null);

function resolveTranslation(translations: Record<string, string>): string {
  return translations["es"] || Object.values(translations)[0] || "";
}

function buildImageUrl(image: any): string {
  if (!image?.id) return "";
  const stored = getStoredToken();
  const token = stored?.access_token ?? "";
  return imageUrl(image.id).replace("access_token=", `access_token=${token}`);
}

function mapCmsToShopProduct(
  product: CmsCategory["products"][number],
  categoryName: string,
): Product {
  return {
    id: product.id,
    name: resolveTranslation(product.name as Record<string, string>),
    priceGross: product.price,
    taxClass: (product.tax_class?.code as Product["taxClass"]) ?? "STD",
    image: buildImageUrl(product.image),
    category: categoryName,
    stock: product.stock ?? undefined,
  };
}

export async function loadProducts() {
  if (isLoading.get()) return;

  isLoading.set(true);
  error.set(null);

  try {
    const client = getAuthClient();
    const cmsCategories = await getCategoriesWithProducts(client as any);

    const mapped: ShopCategory[] = cmsCategories.map((cat) => ({
      id: cat.id,
      name: resolveTranslation(cat.name as Record<string, string>),
      products: cat.products.map((p) =>
        mapCmsToShopProduct(p, resolveTranslation(cat.name as Record<string, string>)),
      ),
    }));

    categories.set(mapped);
  } catch (e: any) {
    console.error("Failed to load products:", e);
    error.set(e.message || "Failed to load products");
  } finally {
    isLoading.set(false);
  }
}
