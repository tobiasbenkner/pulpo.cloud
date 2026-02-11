// apps/shop/src/types/shop.ts

export type TaxClassCode = "STD" | "RED" | "INC" | "NULL" | "SUPER_RED" | "ZERO";

export interface Product {
  id: string;
  name: string;
  priceGross: number;
  taxClass: TaxClassCode;
  image: string;
  category: string;
  stock?: number;
}

export interface CartItem extends Product {
  quantity: number;
  discount?: {
    type: "percent" | "fixed";
    value: number;
  };
}

export interface CartTotals {
  subtotal: string; // NEU: Zwischensumme vor Global-Rabatt
  discountTotal: string; // NEU: Globaler Rabatt in Euro
  gross: string; // Endbetrag
  net: string;
  tax: string;
  count: number;
}

export interface Customer {
  id: string;
  name: string;
  nif: string;
  address: string;
  zip: string;
  city: string;
  email?: string;
}

export interface TransactionResult {
  total: string;
  tendered: string;
  change: string;
  timestamp: number;
  method: "cash" | "card";
  customer?: Customer;
  type: "ticket" | "invoice";
}
