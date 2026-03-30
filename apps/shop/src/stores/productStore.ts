import { atom } from "nanostores";
import {
  getCategoriesWithProducts,
  updateProductStock as apiUpdateProductStock,
  getFileUrl,
} from "../lib/api";
import type { PbProduct } from "../lib/types";
import type { Product } from "../types/shop";
import { loadTaxRates } from "./taxStore";
import { loadTenant, tenant as tenantAtom } from "./printerStore";
import { syncRegisterState } from "./registerStore";

export interface ShopCategory {
  id: string;
  name: string;
  products: Product[];
}

export const categories = atom<ShopCategory[]>([]);
export const isLoading = atom(false);
export const error = atom<string | null>(null);
export const stockEditProduct = atom<Product | null>(null);

function mapPbToShopProduct(
  product: PbProduct,
  categoryName: string,
): Product {
  return {
    id: product.id,
    name: product.name,
    priceGross: product.price_gross,
    taxClass: (product.expand?.tax_class?.code as Product["taxClass"]) ?? "STD",
    image: product.image ? getFileUrl(product as any, product.image) : "",
    category: categoryName,
    stock: product.stock ?? undefined,
    costCenter: product.expand?.cost_center?.name ?? undefined,
    unit: product.unit ?? "unit",
  };
}

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function startAutoRefresh(): () => void {
  const interval = setInterval(() => loadProducts(), REFRESH_INTERVAL);

  function onVisibilityChange() {
    if (document.visibilityState === "visible") {
      loadProducts();
      syncRegisterState();
    }
  }
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    clearInterval(interval);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function decrementStock(
  soldItems: { productId: string; quantity: number }[],
) {
  const current = categories.get();
  const decrements = new Map(soldItems.map((i) => [i.productId, i.quantity]));

  categories.set(
    current.map((cat) => ({
      ...cat,
      products: cat.products.map((p) => {
        const qty = decrements.get(p.id);
        if (qty == null || p.stock == null) return p;
        return { ...p, stock: Math.max(0, p.stock - qty) };
      }),
    })),
  );
}

export function incrementStock(
  returnedItems: { productId: string; quantity: number }[],
) {
  const current = categories.get();
  const increments = new Map(
    returnedItems.map((i) => [i.productId, i.quantity]),
  );

  categories.set(
    current.map((cat) => ({
      ...cat,
      products: cat.products.map((p) => {
        const qty = increments.get(p.id);
        if (qty == null || p.stock == null) return p;
        return { ...p, stock: p.stock + qty };
      }),
    })),
  );
}

export async function setStock(productId: string, stock: number | null) {
  await apiUpdateProductStock(productId, stock);

  const current = categories.get();
  categories.set(
    current.map((cat) => ({
      ...cat,
      products: cat.products.map((p) =>
        p.id === productId ? { ...p, stock: stock ?? undefined } : p,
      ),
    })),
  );
}

export async function loadProducts() {
  if (isLoading.get()) return;

  isLoading.set(true);
  error.set(null);

  try {
    const cmsCategories = await getCategoriesWithProducts();

    const mapped: ShopCategory[] = cmsCategories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      products: cat.products.map((p) => mapPbToShopProduct(p, cat.name)),
    }));

    categories.set(mapped);

    await loadTenant();

    const t = tenantAtom.get();
    const missing: string[] = [];
    if (!t?.name) missing.push("nombre");
    if (!t?.nif) missing.push("NIF");
    if (!t?.street) missing.push("dirección");
    if (!t?.zip) missing.push("código postal");
    if (!t?.city) missing.push("ciudad");

    if (missing.length > 0) {
      const msg = `Datos de empresa incompletos: faltan ${missing.join(", ")}. Configure los datos del negocio para poder facturar correctamente.`;
      console.error(msg);
      error.set(msg);
      return;
    }

    loadTaxRates(t!.zip);
  } catch (e: any) {
    console.error("Failed to load products:", e);
    error.set(e.message || "Failed to load products");
  } finally {
    isLoading.set(false);
  }
}
