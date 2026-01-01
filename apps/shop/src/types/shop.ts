// apps/shop/src/types/shop.ts

export type TaxClassCode = "STD" | "RED" | "ZERO";

export interface Product {
  id: string;
  name: string;
  priceGross: number;
  taxClass: TaxClassCode;
  image: string;
  category: string;
  stock: number; // NEU: Lagerbestand
}

export interface CartItem extends Product {
  quantity: number;
  discount?: {
    type: "percent" | "fixed";
    value: number;
  };
}

export interface CartTotals {
  gross: string;
  net: string;
  tax: string;
  count: number;
}

export interface Customer {
  id: string;
  name: string; // z.B. "Hotel Paradiso S.L."
  nif: string; // z.B. "B12345678"
  address: string; // z.B. "Calle Principal 1"
  zip: string;
  city: string;
  email?: string;
}

// Update TransactionResult um den Kunden
export interface TransactionResult {
  total: string;
  tendered: string;
  change: string;
  timestamp: number;
  method: "cash" | "card";
  customer?: Customer; // NEU: Optionaler Kunde
  type: "ticket" | "invoice"; // NEU: Typ
}
