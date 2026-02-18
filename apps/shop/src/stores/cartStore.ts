// apps/shop/src/stores/cartStore.ts

import { atom, computed } from "nanostores";
import { persistentMap, persistentAtom } from "@nanostores/persistent";
import Big from "big.js";
import { getAuthClient } from "@pulpo/auth";
import { createInvoice, updateInvoicePaymentMethod } from "@pulpo/cms";
import { calculateInvoice } from "@pulpo/invoice";
import type {
  Product,
  CartItem,
  CartTotals,
  TransactionResult,
  Customer,
} from "../types/shop";
import { taxRates } from "./taxStore";
import { printInvoice } from "./printerStore";
import { decrementStock } from "./productStore";

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
export const customerModalMode = atom<"select" | "manage">("select");
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
    : `Carrito ${new Date().toLocaleTimeString([], {
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

export const swapLastTransactionMethod = async () => {
  const tx = lastTransaction.get();
  if (!tx) return;
  const newMethod = tx.method === "cash" ? "card" : "cash";

  const client = getAuthClient();
  await updateInvoicePaymentMethod(
    client as any,
    tx.paymentId,
    newMethod,
    tx.total,
  );

  lastTransaction.set({
    ...tx,
    method: newMethod,
    tendered: tx.total,
    change: "0.00",
  });
};

export const completeTransaction = async (
  total: string,
  tendered: string,
  method: "cash" | "card",
) => {
  const totals = cartTotals.get();
  const customer = selectedCustomer.get();
  const type = customer ? "invoice" : "ticket";
  const change = new Big(tendered).minus(new Big(total)).toFixed(2);

  // Invoice über Extension-Endpoint erstellen (invoice_number wird server-seitig gesetzt)
  let invoice: any;
  try {
    const client = getAuthClient();
    invoice = await createInvoice(client, {
      status: "paid",
      items: totals.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        discount: item.discountType
          ? { type: item.discountType, value: Number(item.discountValue) }
          : null,
      })),
      discount: totals.discountType
        ? { type: totals.discountType, value: Number(totals.discountValue) }
        : null,
      customer_id: customer?.id ?? null,
      payments: [
        {
          method,
          amount: total,
          tendered,
          change,
          tip: null,
        },
      ],
    });
  } catch (e) {
    console.error("Failed to create invoice:", e);
    return; // Cart NICHT leeren bei Fehler
  }

  const invoiceNumber = invoice?.invoice_number ?? "";
  const invoiceId = invoice?.id ?? "";
  const paymentId = invoice?.payments?.[0]?.id ?? 0;

  // Erfolg: lokale Transaktion speichern + Cart leeren
  const txData: TransactionResult = {
    total,
    tendered,
    change,
    method,
    timestamp: Date.now(),
    customer: customer || undefined,
    type,
    invoiceNumber,
    invoiceId,
    paymentId,
  };

  lastTransaction.set(txData);

  if (shouldPrintReceipt.get()) {
    // Fire-and-forget: nicht awaiten, damit UI nicht blockiert
    printInvoice(invoice);
  }

  decrementStock(
    totals.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  );

  cartItems.set({});
  globalDiscount.set(null);
  selectedCustomer.set(null);
  isPaymentModalOpen.set(false);
};

// --- COMPUTED: TOTALS ---

export const cartTotals = computed(
  [cartItems, globalDiscount, taxRates],
  (items, globalDisc, rates): CartTotals => {
    const lines = Object.values(items).map((item) => ({
      productId: item.id,
      productName: item.name,
      priceGross: item.priceGross,
      taxRate: rates[item.taxClass] ?? "0",
      quantity: item.quantity,
      discount: item.discount ?? null,
      costCenter: item.costCenter ?? null,
    }));
    return calculateInvoice(lines, globalDisc ?? null);
  },
);
