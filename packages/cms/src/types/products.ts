import { DirectusFile } from "@directus/sdk";
import { ReducedTranslations } from "../types";
import { TaxClass } from "./tax";

export interface Product {
  id: string;
  name: ReducedTranslations;
  description: ReducedTranslations;
  note: ReducedTranslations;
  price: number;
  image: DirectusFile;
  allergies: string[];
  category: string;
  sort: number;
  stock: number | null;
  tax_class: TaxClass | null;
  price_gross: string;
  cost_center: { id: string; name: string } | null;
}

export interface ProductCategory {
  id: string;
  name: ReducedTranslations;
  description: ReducedTranslations;
  image: DirectusFile;
  sort: number;
  products: Product[];
}
