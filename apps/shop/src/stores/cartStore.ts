// apps/shop/src/stores/cartStore.ts

import { atom, computed } from "nanostores";
import { persistentMap, persistentAtom } from "@nanostores/persistent";
import Big from "big.js";
import type {
  Product,
  CartItem,
  CartTotals,
  TransactionResult,
  TaxClassCode,
  Customer,
} from "../types/shop";
import { taxRates } from "./taxStore";

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

// --- STATE (PERSISTENT) ---

export const cartItems = persistentMap<Record<string, CartItem>>(
  "cart:data",
  {},
  { encode: JSON.stringify, decode: JSON.parse },
);

export const lastTransaction = persistentAtom<TransactionResult | null>(
  "cart:last_tx",
  null,
  { encode: JSON.stringify, decode: JSON.parse },
);

export const shouldPrintReceipt = persistentAtom<boolean>(
  "settings:print",
  true,
  { encode: JSON.stringify, decode: JSON.parse },
);

export const parkedCarts = persistentMap<Record<string, ParkedCart>>(
  "cart:parked",
  {},
  { encode: JSON.stringify, decode: JSON.parse },
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
export const isQuantityModalOpen = atom<{ itemId: string | null }>({
  itemId: null,
});

// --- ACTIONS: CART ---

export const setItemQuantity = (id: string, quantity: number) => {
  const current = cartItems.get();
  const item = current[id];

  if (!item) return;

  if (quantity <= 0) {
    // Wenn 0 oder weniger eingegeben wird, entfernen wir das Item
    const { [id]: _, ...rest } = current;
    cartItems.set(rest);
  } else {
    cartItems.setKey(id, { ...item, quantity });
  }
};

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
  value: number,
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
  method: "cash" | "card",
) => {
  const change = new Big(tendered).minus(new Big(total)).toFixed(2);
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
  [cartItems, globalDiscount, taxRates],
  (items, globalDisc, rates): CartTotals => {
    const ZERO = new Big(0);
    const HUNDRED = new Big(100);
    let subtotalGross = ZERO;
    let totalNet = ZERO;

    // 1. Zwischensumme (nach Artikelrabatten)
    const lineGrossValues: Big[] = [];
    const itemList = Object.values(items);

    itemList.forEach((item) => {
      let lineGross = new Big(item.priceGross).times(item.quantity);
      if (item.discount) {
        if (item.discount.type === "fixed") {
          lineGross = lineGross.minus(item.discount.value);
        } else {
          lineGross = lineGross.minus(
            lineGross.times(item.discount.value).div(HUNDRED),
          );
        }
      }
      if (lineGross.lt(ZERO)) lineGross = ZERO;
      lineGrossValues.push(lineGross);
      subtotalGross = subtotalGross.plus(lineGross);
    });

    // 2. Global Discount
    let finalTotalGross = subtotalGross;
    let discountAmount = ZERO;

    if (globalDisc) {
      if (globalDisc.type === "fixed") {
        discountAmount = new Big(globalDisc.value);
        finalTotalGross = finalTotalGross.minus(discountAmount);
      } else {
        discountAmount = finalTotalGross.times(globalDisc.value).div(HUNDRED);
        finalTotalGross = finalTotalGross.minus(discountAmount);
      }
    }

    if (finalTotalGross.lt(ZERO)) finalTotalGross = ZERO;
    if (discountAmount.gt(subtotalGross)) discountAmount = subtotalGross;

    // 3. Steuer rückrechnen (gruppiert nach Rate)
    const discountRatio = subtotalGross.gt(ZERO)
      ? finalTotalGross.div(subtotalGross)
      : new Big(1);

    const taxByRate = new Map<number, Big>();

    itemList.forEach((item, i) => {
      const lineGross = lineGrossValues[i];
      const lineGrossAfterGlobal = lineGross.times(discountRatio);
      const rateNum = rates[item.taxClass] ?? 0;
      const rate = new Big(rateNum);
      const lineNet = lineGrossAfterGlobal.div(new Big(1).plus(rate));
      const lineTax = lineGrossAfterGlobal.minus(lineNet);
      totalNet = totalNet.plus(lineNet);

      if (rateNum > 0) {
        const prev = taxByRate.get(rateNum) ?? ZERO;
        taxByRate.set(rateNum, prev.plus(lineTax));
      }
    });

    const taxBreakdown = Array.from(taxByRate.entries())
      .sort(([a], [b]) => a - b)
      .map(([rate, amount]) => ({ rate, amount: amount.toFixed(2) }));

    return {
      subtotal: subtotalGross.toFixed(2),
      discountTotal: discountAmount.toFixed(2),
      gross: finalTotalGross.toFixed(2),
      net: totalNet.toFixed(2),
      tax: finalTotalGross.minus(totalNet).toFixed(2),
      taxBreakdown,
      count: itemList.reduce((sum, item) => sum + item.quantity, 0),
    };
  },
);
