import { map, atom, computed } from "nanostores";
import { persistentMap, persistentAtom } from "@nanostores/persistent";
import type {
  Product,
  CartItem,
  CartTotals,
  TransactionResult,
  TaxClassCode,
  Customer,
} from "../types/shop";

// --- TYPEN FÜR PARKED CART ---
export interface ParkedCart {
  id: string;
  items: Record<string, CartItem>;
  total: string;
  timestamp: number;
  customerName: string;
  customer: Customer | null;
}

// --- KONFIGURATION ---
const TAX_RATES: Record<TaxClassCode, number> = {
  STD: 0.07,
  RED: 0.03,
  ZERO: 0.0,
};

// --- STATE (PERSISTENT) ---

// 1. Warenkorb
export const cartItems = persistentMap<Record<string, CartItem>>(
  "cart:data",
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// 2. Letzte Transaktion
export const lastTransaction = persistentAtom<TransactionResult | null>(
  "cart:last_tx",
  null,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// 3. Einstellungen (Drucken)
export const shouldPrintReceipt = persistentAtom<boolean>(
  "settings:print",
  true,
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// 4. Geparkte Warenkörbe
export const parkedCarts = persistentMap<Record<string, ParkedCart>>(
  "cart:parked",
  {},
  {
    encode: JSON.stringify,
    decode: JSON.parse,
  }
);

// --- STATE (SESSION) ---

export const isPaymentModalOpen = atom<boolean>(false);
export const isCustomAmountOpen = atom<boolean>(false);
export const isCustomerModalOpen = atom<boolean>(false);

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

// --- ACTIONS: PARK & HOLD ---

export const parkCurrentCart = () => {
  const items = cartItems.get();
  const keys = Object.keys(items);
  if (keys.length === 0) return; // Nichts zu parken

  const id = `park-${Date.now()}`;
  const cartArray = Object.values(items);

  // Berechne Summe
  let totalVal = 0;
  cartArray.forEach((i) => (totalVal += i.priceGross * i.quantity));

  // Kunde
  const cust = selectedCustomer.get();
  const label = cust
    ? cust.name
    : `Warenkorb ${new Date().toLocaleTimeString().slice(0, 5)}`;

  const newParked: ParkedCart = {
    id,
    items: { ...items }, // Deep copy durch JSON bei persistierung automatisch
    total: totalVal.toFixed(2),
    timestamp: Date.now(),
    customerName: label,
    customer: cust,
  };

  // Speichern
  parkedCarts.setKey(id, newParked);

  // Leeren
  cartItems.set({});
  selectedCustomer.set(null);
};

export const restoreParkedCart = (parkId: string) => {
  const parked = parkedCarts.get()[parkId];
  if (!parked) return;

  // Wiederherstellen
  cartItems.set(parked.items);
  selectedCustomer.set(parked.customer);

  // Löschen aus Park-Liste
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
  // window.print();
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

  cartItems.set({});
  selectedCustomer.set(null);
  isPaymentModalOpen.set(false);
};

// --- COMPUTED ---

export const cartTotals = computed(cartItems, (items): CartTotals => {
  let totalGross = 0;
  let totalNet = 0;

  Object.values(items).forEach((item) => {
    const rate = TAX_RATES[item.taxClass] || 0;
    const lineGross = item.priceGross * item.quantity;
    const lineNet = lineGross / (1 + rate);

    totalGross += lineGross;
    totalNet += lineNet;
  });

  return {
    gross: totalGross.toFixed(2),
    net: totalNet.toFixed(2),
    tax: (totalGross - totalNet).toFixed(2),
    count: Object.values(items).reduce((sum, item) => sum + item.quantity, 0),
  };
});
