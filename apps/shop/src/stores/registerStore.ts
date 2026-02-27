import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import Big from "big.js";
import { getAuthClient } from "@pulpo/auth";
import {
  getInvoices,
  updateInvoicePaymentMethod,
  rectifyInvoice,
  openClosure,
  closeClosure,
  getLastClosure,
  getOpenClosure,
  getClosuresForDate,
} from "@pulpo/cms";
import type { Invoice, CashRegisterClosure } from "@pulpo/cms";
import type { ClosureReport } from "../types/shop";
import { lastTransaction } from "./cartStore";

// --- PERSISTENT (localStorage) ---

export const isRegisterOpen = persistentAtom<boolean>("register:open", false, {
  encode: JSON.stringify,
  decode: JSON.parse,
});

export const currentClosureId = persistentAtom<string>(
  "register:closure_id",
  "",
);

export const startingCash = persistentAtom<string>(
  "register:starting_cash",
  "0.00",
);

export const periodStart = persistentAtom<string>("register:period_start", "");

// --- SESSION (atoms) ---

export const isClosureModalOpen = atom<boolean>(false);
export const closureReport = atom<ClosureReport | null>(null);
export const closureLoading = atom<boolean>(false);

export const isShiftInvoicesModalOpen = atom<boolean>(false);
export const shiftInvoices = atom<Invoice[]>([]);

export const isRectificativaModalOpen = atom<boolean>(false);
export const rectificativaInvoice = atom<Invoice | null>(null);

export const isXReportModalOpen = atom<boolean>(false);

// --- ACTIONS ---

export async function openRegister(startAmount: string): Promise<void> {
  const client = getAuthClient();

  try {
    const closure = await openClosure(client as any, {
      starting_cash: startAmount,
    });

    if (!closure?.id) throw new Error("Failed to create closure");

    currentClosureId.set(closure.id);
    startingCash.set(startAmount);
    periodStart.set(closure.period_start);
    lastTransaction.set(null);
    isRegisterOpen.set(true);
  } catch (e: any) {
    // 409 = already open closure — sync state from backend instead of showing error
    const status = e?.response?.status;
    if (status === 409) {
      await syncRegisterState();
      return;
    }
    throw e;
  }
}

export async function generateClosureReport(): Promise<ClosureReport> {
  closureLoading.set(true);

  try {
    const client = getAuthClient();
    const closureId = currentClosureId.get();
    const pStart = periodStart.get();

    // Query invoices assigned to this closure by the backend
    const invoices = await getInvoices(client as any, {
      status: ["paid", "rectificada"],
      closureId: closureId || undefined,
    });

    const ZERO = new Big(0);
    let totalGross = ZERO;
    let totalNet = ZERO;
    let totalTax = ZERO;
    let totalCash = ZERO;
    let totalCard = ZERO;
    let totalChange = ZERO;
    let ticketCount = 0;
    let facturaCount = 0;
    let rectificativaCount = 0;

    // Tax breakdown: rate (percentage string) -> { net, tax }
    const taxMap = new Map<string, { net: Big; tax: Big }>();

    for (const inv of invoices) {
      if (inv.invoice_type === "ticket") ticketCount++;
      else if (inv.invoice_type === "factura") facturaCount++;
      else if (inv.invoice_type === "rectificativa") rectificativaCount++;
      totalGross = totalGross.plus(new Big(inv.total_gross));
      totalNet = totalNet.plus(new Big(inv.total_net));
      totalTax = totalTax.plus(new Big(inv.total_tax));

      // Payments
      for (const pmt of inv.payments ?? []) {
        if (pmt.method === "cash") {
          totalCash = totalCash.plus(new Big(pmt.amount));
          if (pmt.change) {
            totalChange = totalChange.plus(new Big(pmt.change));
          }
        } else {
          totalCard = totalCard.plus(new Big(pmt.amount));
        }
      }

      // Tax breakdown: prefer stored, fallback to items
      if (Array.isArray(inv.tax_breakdown) && inv.tax_breakdown.length > 0) {
        for (const entry of inv.tax_breakdown) {
          const rate = String(entry.rate);
          const existing = taxMap.get(rate) ?? { net: ZERO, tax: ZERO };
          taxMap.set(rate, {
            net: existing.net.plus(new Big(entry.net)),
            tax: existing.tax.plus(new Big(entry.tax)),
          });
        }
      } else {
        const HUNDRED = new Big(100);
        const itemTaxMap = new Map<string, { gross: Big }>();
        for (const item of inv.items ?? []) {
          const rate = item.tax_rate_snapshot;
          const itemGross = new Big(item.row_total_gross);
          const existing = itemTaxMap.get(rate) ?? { gross: ZERO };
          itemTaxMap.set(rate, { gross: existing.gross.plus(itemGross) });
        }
        for (const [rate, v] of itemTaxMap) {
          const gGross = new Big(v.gross.toFixed(2));
          const rateDecimal = new Big(rate).div(HUNDRED);
          const net = new Big(gGross.div(new Big(1).plus(rateDecimal)).toFixed(2));
          const tax = gGross.minus(net);
          const existing = taxMap.get(rate) ?? { net: ZERO, tax: ZERO };
          taxMap.set(rate, {
            net: existing.net.plus(net),
            tax: existing.tax.plus(tax),
          });
        }
      }
    }

    const start = startingCash.get();
    // totalCash = sum(pmt.amount) = net cash gain per transaction (already excludes change)
    const expectedCash = new Big(start).plus(totalCash);

    const taxBreakdown = Array.from(taxMap.entries())
      .sort(([a], [b]) => new Big(a).cmp(new Big(b)))
      .map(([rate, v]) => ({
        rate,
        net: v.net.toFixed(2),
        tax: v.tax.toFixed(2),
      }));

    const report: ClosureReport = {
      periodStart: pStart || new Date().toISOString(),
      periodEnd: new Date().toISOString(),
      transactionCount: invoices.length,
      ticketCount,
      facturaCount,
      rectificativaCount,
      totalGross: totalGross.toFixed(2),
      totalNet: totalNet.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalCash: totalCash.toFixed(2),
      totalCard: totalCard.toFixed(2),
      totalChange: totalChange.toFixed(2),
      expectedCash: expectedCash.toFixed(2),
      startingCash: start,
      taxBreakdown,
    };

    closureReport.set(report);
    closureLoading.set(false);
    return report;
  } catch (e) {
    console.error("Failed to generate closure report:", e);
    closureLoading.set(false);
    throw e;
  }
}

export async function finalizeClosure(
  countedCash: string,
  denominationCount: { cents: number; label: string; qty: number }[],
): Promise<void> {
  const report = closureReport.get();
  if (!report) throw new Error("No closure report generated");

  const closureId = currentClosureId.get();
  if (!closureId) throw new Error("No open closure ID");

  const client = getAuthClient();

  try {
    // Close via extension (server computes all totals from invoice data)
    await closeClosure(client as any, {
      counted_cash: countedCash,
      denomination_count: denominationCount,
    });
  } catch (e: any) {
    // Already closed (404) — reset state silently
    const status = e?.response?.status;
    if (status === 404) {
      resetRegisterState();
      return;
    }
    throw e;
  }

  // Reset register state
  resetRegisterState();
}

export function resetRegisterState() {
  isRegisterOpen.set(false);
  currentClosureId.set("");
  startingCash.set("0.00");
  periodStart.set("");
  closureReport.set(null);
  isClosureModalOpen.set(false);
}

export async function fetchLastClosure() {
  try {
    const client = getAuthClient();
    return await getLastClosure(client as any);
  } catch (e) {
    console.error("Failed to fetch last closure:", e);
    return null;
  }
}

/**
 * Sync register state with backend on app startup.
 * If the backend has an open closure but localStorage says closed (or vice versa),
 * restore from backend.
 */
export async function syncRegisterState(): Promise<void> {
  try {
    const client = getAuthClient();
    const open = await getOpenClosure(client as any);

    if (open) {
      // Backend has an open closure — ensure frontend matches
      isRegisterOpen.set(true);
      currentClosureId.set(open.id);
      startingCash.set(open.starting_cash);
      periodStart.set(open.period_start);
    } else if (isRegisterOpen.get()) {
      // Frontend thinks register is open but backend disagrees — reset
      isRegisterOpen.set(false);
      currentClosureId.set("");
    }
  } catch (e) {
    console.error("Failed to sync register state:", e);
  }
}

export async function loadShiftInvoices(): Promise<void> {
  const client = getAuthClient();
  const closureId = currentClosureId.get();

  const invoices = await getInvoices(client as any, {
    status: ["paid", "rectificada"],
    closureId: closureId || undefined,
  });

  shiftInvoices.set(invoices as Invoice[]);
}

export async function createRectificativa(data: {
  original_invoice_id: string;
  reason: string;
  reason_detail?: string;
  payment_method: "cash" | "card";
  items: {
    product_id: string | null;
    product_name: string;
    quantity: number;
    tax_rate_snapshot: string;
    price_gross_unit: string;
    row_total_gross: string;
    discount_type: "percent" | "fixed" | null;
    discount_value: string | null;
  }[];
}): Promise<{ rectificativa: Invoice; original: Invoice }> {
  const client = getAuthClient();
  const result = await rectifyInvoice(client as any, data);

  // Update local shift invoices list
  const current = shiftInvoices.get();
  const updated = current.map((inv) =>
    inv.id === result.original.id ? (result.original as Invoice) : inv,
  );
  updated.unshift(result.rectificativa as Invoice);
  shiftInvoices.set(updated);

  return result as { rectificativa: Invoice; original: Invoice };
}

export async function loadDailyClosures(
  date: string,
): Promise<CashRegisterClosure[]> {
  const client = getAuthClient();
  return await getClosuresForDate(client as any, date);
}

export async function swapPaymentMethod(
  invoiceId: string,
  paymentId: number,
  newMethod: "cash" | "card",
  amount: string,
): Promise<void> {
  const client = getAuthClient();
  await updateInvoicePaymentMethod(client as any, paymentId, newMethod, amount);

  // Update local state
  const current = shiftInvoices.get();
  shiftInvoices.set(
    current.map((inv) => {
      if (inv.id !== invoiceId) return inv;
      return {
        ...inv,
        payments: inv.payments.map((p) =>
          p.id === paymentId
            ? { ...p, method: newMethod, tendered: amount, change: "0.00" }
            : p,
        ),
      };
    }),
  );
}
