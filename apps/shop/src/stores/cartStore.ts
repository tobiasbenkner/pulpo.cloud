// apps/shop/src/stores/cartStore.ts

import { atom, computed } from "nanostores";
import { persistentMap, persistentAtom } from "@nanostores/persistent";
import type {
  Product,
  CartItem,
  CartTotals,
  TransactionResult,
  TaxClassCode,
  Customer,
} from "../types/shop";

// --- TYPEN ---

export interface ParkedCart {
  id: string;
  items: Record<string, CartItem>;
  total: string;
  timestamp: number;
  customerName: string;
  customer: Customer | null;
  globalDiscount: { type: "percent" | "fixed"; value: number } | null; // NEU
}

// --- KONFIGURATION ---
const TAX_RATES: Record<TaxClassCode, number> = {
  STD: 0.07, // 7% IGIC
  RED: 0.03, // 3%
  ZERO: 0.0,
};

// --- STATE (PERSISTENT) ---

export const cartItems = persistentMap<Record<string, CartItem>>(
  "cart:data",
  {},
  { encode: JSON.stringify, decode: JSON.parse }
);

export const lastTransaction = persistentAtom<TransactionResult | null>(
  "cart:last_tx",
  null,
  { encode: JSON.stringify, decode: JSON.parse }
);

export const shouldPrintReceipt = persistentAtom<boolean>(
  "settings:print",
  true,
  { encode: JSON.stringify, decode: JSON.parse }
);

export const parkedCarts = persistentMap<Record<string, ParkedCart>>(
  "cart:parked",
  {},
  { encode: JSON.stringify, decode: JSON.parse }
);

export const globalDiscount = persistentAtom<{
  type: "percent" | "fixed";
  value: number;
} | null>("cart:global_discount", null, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

// --- STATE (SESSION) ---

export const isPaymentModalOpen = atom<boolean>(false);
export const isCustomAmountOpen = atom<boolean>(false);
export const isCustomerModalOpen = atom<boolean>(false);
export const isDiscountModalOpen = atom<{ itemId: string | null }>({
  itemId: null,
});
export const selectedCustomer = atom<Customer | null>(null);

// --- ACTIONS: CART ---

export const addToCart = (product: Product) => {
  const current = cartItems.get();
  const existing = current[product.id];
  if (existing) {
    cartItems.setKey(product.id, {
      ...existing,
      quantity: existing.quantity + 1,
    });
  } else {
    cartItems.setKey(product.id, { ...product, quantity: 1 });
  }
};

export const decreaseQuantity = (productId: string) => {
  const current = cartItems.get();
  const existing = current[productId];
  if (!existing) return;
  if (existing.quantity > 1) {
    cartItems.setKey(productId, {
      ...existing,
      quantity: existing.quantity - 1,
    });
  } else {
    const { [productId]: _, ...rest } = current;
    cartItems.set(rest);
  }
};

export const removeFromCart = (productId: string) => {
  const current = cartItems.get();
  const { [productId]: _, ...rest } = current;
  cartItems.set(rest);
};

// --- ACTIONS: CUSTOMER ---

export const setCustomer = (customer: Customer | null) => {
  selectedCustomer.set(customer);
  if (customer) isCustomerModalOpen.set(false);
};

// --- ACTIONS: DISCOUNT ---

const setGlobalDiscount = (type: "percent" | "fixed", value: number) => {
  let validated = value < 0 ? 0 : value;
  if (type === "percent" && validated > 100) validated = 100;
  globalDiscount.set({ type, value: validated });
};

export const applyDiscount = (
  id: string,
  type: "percent" | "fixed",
  value: number
) => {
  if (id === "GLOBAL") {
    setGlobalDiscount(type, value);
    return;
  }

  const current = cartItems.get();
  const item = current[id];
  if (item) {
    let validatedValue = value;
    if (type === "percent" && value > 100) validatedValue = 100;
    if (value < 0) validatedValue = 0;
    cartItems.setKey(id, {
      ...item,
      discount: { type, value: validatedValue },
    });
  }
};

export const removeDiscount = (id: string) => {
  if (id === "GLOBAL") {
    globalDiscount.set(null);
    return;
  }
  const current = cartItems.get();
  const item = current[id];
  if (item) {
    const { discount, ...rest } = item;
    cartItems.setKey(id, rest as CartItem);
  }
};

// --- ACTIONS: PARK & HOLD ---

export const parkCurrentCart = () => {
  const items = cartItems.get();
  const keys = Object.keys(items);
  if (keys.length === 0) return;

  const id = `park-${Date.now()}`;
  const totals = cartTotals.get();
  const cust = selectedCustomer.get();
  const gDisc = globalDiscount.get(); // UPDATE: Aktuellen Rabatt holen

  const label = cust
    ? cust.name
    : `Warenkorb ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })}`;

  const newParked: ParkedCart = {
    id,
    items: { ...items },
    total: totals.gross,
    timestamp: Date.now(),
    customerName: label,
    customer: cust,
    globalDiscount: gDisc, // UPDATE: Rabatt mitspeichern
  };

  parkedCarts.setKey(id, newParked);

  // Reset Current Cart
  cartItems.set({});
  globalDiscount.set(null);
  selectedCustomer.set(null);
};

export const restoreParkedCart = (parkId: string) => {
  const parked = parkedCarts.get()[parkId];
  if (!parked) return;

  // Restore Data
  cartItems.set(parked.items);
  selectedCustomer.set(parked.customer);

  // UPDATE: Rabatt wiederherstellen (mit Fallback null, falls alte Daten existieren)
  globalDiscount.set(parked.globalDiscount || null);

  // Remove form Parked List
  const currentParked = { ...parkedCarts.get() };
  delete currentParked[parkId];
  parkedCarts.set(currentParked);
};

export const deleteParkedCart = (parkId: string) => {
  const currentParked = { ...parkedCarts.get() };
  delete currentParked[parkId];
  parkedCarts.set(currentParked);
};

// --- ACTIONS: TRANSACTION ---

export const triggerPrint = (transaction: TransactionResult) => {
  console.log("🖨️ DRUCKE BON:", transaction.total, "€");
};

export const swapLastTransactionMethod = () => {
  const tx = lastTransaction.get();
  if (!tx) return;
  const newMethod = tx.method === "cash" ? "card" : "cash";
  lastTransaction.set({ ...tx, method: newMethod });
};

export const completeTransaction = (
  total: string,
  tendered: string,
  method: "cash" | "card"
) => {
  const change = (parseFloat(tendered) - parseFloat(total)).toFixed(2);
  const customer = selectedCustomer.get();
  const type = customer ? "invoice" : "ticket";

  const txData: TransactionResult = {
    total,
    tendered,
    change,
    method,
    timestamp: Date.now(),
    customer: customer || undefined,
    type,
  };

  lastTransaction.set(txData);

  if (shouldPrintReceipt.get()) {
    triggerPrint(txData);
  }

  // Reset alles
  cartItems.set({});
  globalDiscount.set(null);
  selectedCustomer.set(null);
  isPaymentModalOpen.set(false);
};

// --- COMPUTED: TOTALS ---

export const cartTotals = computed(
  [cartItems, globalDiscount],
  (items, globalDisc): CartTotals => {
    let subtotalGross = 0;
    let totalNet = 0;

    // 1. Zwischensumme (nach Artikelrabatten)
    Object.values(items).forEach((item) => {
      let lineGross = item.priceGross * item.quantity;
      if (item.discount) {
        if (item.discount.type === "fixed") {
          lineGross -= item.discount.value;
        } else {
          lineGross -= lineGross * (item.discount.value / 100);
        }
      }
      if (lineGross < 0) lineGross = 0;
      subtotalGross += lineGross;
    });

    // 2. Global Discount
    let finalTotalGross = subtotalGross;
    let discountAmount = 0;

    if (globalDisc) {
      if (globalDisc.type === "fixed") {
        discountAmount = globalDisc.value;
        finalTotalGross -= discountAmount;
      } else {
        discountAmount = finalTotalGross * (globalDisc.value / 100);
        finalTotalGross -= discountAmount;
      }
    }

    if (finalTotalGross < 0) finalTotalGross = 0;
    if (discountAmount > subtotalGross) discountAmount = subtotalGross;

    // 3. Steuer rückrechnen
    const discountRatio =
      subtotalGross > 0 ? finalTotalGross / subtotalGross : 1;

    Object.values(items).forEach((item) => {
      let lineGross = item.priceGross * item.quantity;
      if (item.discount) {
        if (item.discount.type === "fixed") lineGross -= item.discount.value;
        else lineGross -= lineGross * (item.discount.value / 100);
      }
      if (lineGross < 0) lineGross = 0;

      const lineGrossAfterGlobal = lineGross * discountRatio;
      const rate = TAX_RATES[item.taxClass] || 0;
      const lineNet = lineGrossAfterGlobal / (1 + rate);

      totalNet += lineNet;
    });

    return {
      subtotal: subtotalGross.toFixed(2),
      discountTotal: discountAmount.toFixed(2),
      gross: finalTotalGross.toFixed(2),
      net: totalNet.toFixed(2),
      tax: (finalTotalGross - totalNet).toFixed(2),
      count: Object.values(items).reduce((sum, item) => sum + item.quantity, 0),
    };
  }
);
