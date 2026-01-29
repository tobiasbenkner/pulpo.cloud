import { DirectusFile } from "@directus/sdk";
import { ReducedTranslations } from "../types";

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
}

export interface ProductCategory {
  id: string;
  name: ReducedTranslations;
  description: ReducedTranslations;
  image: DirectusFile;
  sort: number;
  products: Product[];
}
