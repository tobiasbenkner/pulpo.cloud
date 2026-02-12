import { atom } from "nanostores";
import { persistentAtom } from "@nanostores/persistent";
import Big from "big.js";
import { getAuthClient } from "@pulpo/auth";
import {
  getInvoices,
  openClosure,
  closeClosure,
  getLastClosure,
  getOpenClosure,
} from "@pulpo/cms";
import type { ClosureReport } from "../types/shop";

// --- PERSISTENT (localStorage) ---

export const isRegisterOpen = persistentAtom<boolean>(
  "register:open",
  false,
  { encode: JSON.stringify, decode: JSON.parse },
);

export const currentClosureId = persistentAtom<string>(
  "register:closure_id",
  "",
);

export const startingCash = persistentAtom<string>(
  "register:starting_cash",
  "0.00",
);

export const periodStart = persistentAtom<string>(
  "register:period_start",
  "",
);

// --- SESSION (atoms) ---

export const isClosureModalOpen = atom<boolean>(false);
export const closureReport = atom<ClosureReport | null>(null);
export const closureLoading = atom<boolean>(false);

// --- ACTIONS ---

export async function openRegister(startAmount: string): Promise<void> {
  const client = getAuthClient();
  const now = new Date().toISOString();

  const closure = await openClosure(client as any, {
    period_start: now,
    starting_cash: startAmount,
  });

  if (!closure?.id) throw new Error("Failed to create closure");

  currentClosureId.set(closure.id);
  startingCash.set(startAmount);
  periodStart.set(now);
  isRegisterOpen.set(true);
}

export async function generateClosureReport(): Promise<ClosureReport> {
  closureLoading.set(true);

  try {
    const client = getAuthClient();
    const closureId = currentClosureId.get();
    const pStart = periodStart.get();

    // Query invoices assigned to this closure by the backend
    const invoices = await getInvoices(client as any, {
      status: "paid",
      closureId: closureId || undefined,
    });

    const ZERO = new Big(0);
    let totalGross = ZERO;
    let totalNet = ZERO;
    let totalTax = ZERO;
    let totalCash = ZERO;
    let totalCard = ZERO;
    let totalChange = ZERO;

    // Tax breakdown: rate (percentage string) -> { net, tax }
    const taxMap = new Map<string, { net: Big; tax: Big }>();

    for (const inv of invoices) {
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

      // Tax breakdown from items
      for (const item of inv.items ?? []) {
        const rate = item.tax_rate_snapshot; // percentage e.g. "7.00"
        const itemNet = new Big(item.row_total_net_precise);
        const itemGross = new Big(item.row_total_gross);
        const itemTax = itemGross.minus(itemNet);

        const existing = taxMap.get(rate) ?? { net: ZERO, tax: ZERO };
        taxMap.set(rate, {
          net: existing.net.plus(itemNet),
          tax: existing.tax.plus(itemTax),
        });
      }
    }

    const start = startingCash.get();
    const expectedCash = new Big(start)
      .plus(totalCash)
      .minus(totalChange);

    const taxBreakdown = Array.from(taxMap.entries())
      .filter(([, v]) => v.tax.gt(0))
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

  const difference = new Big(countedCash).minus(new Big(report.expectedCash));

  const client = getAuthClient();
  await closeClosure(client as any, closureId, {
    period_end: report.periodEnd,
    total_gross: report.totalGross,
    total_net: report.totalNet,
    total_tax: report.totalTax,
    total_cash: report.totalCash,
    total_card: report.totalCard,
    total_change: report.totalChange,
    transaction_count: report.transactionCount,
    expected_cash: report.expectedCash,
    counted_cash: countedCash,
    difference: difference.toFixed(2),
    tax_breakdown: report.taxBreakdown,
    denomination_count: denominationCount,
  });

  // Reset register state
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
