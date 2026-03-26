<script lang="ts">
	import { onMount } from "svelte";
	import { getAuthClient } from "@pulpo/auth";
	import { getReport, getInvoices } from "@pulpo/cms";
	import type { AggregatedReport, Invoice } from "@pulpo/cms";
	import DashboardShell from "../DashboardShell.svelte";
	import KpiCards from "../KpiCards.svelte";
	import RevenueChart from "../RevenueChart.svelte";
	import PaymentPieChart from "../PaymentPieChart.svelte";
	import TopProductsChart from "../TopProductsChart.svelte";

	let todayReport: AggregatedReport | null = $state(null);
	let weekReports: { date: string; report: AggregatedReport }[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	function formatDate(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	}

	function buildReportFromInvoices(invoices: Invoice[], dateStr: string): AggregatedReport {
		let totalGross = 0;
		let totalNet = 0;
		let totalTax = 0;
		let totalCash = 0;
		let totalCard = 0;
		let tickets = 0;
		let facturas = 0;
		let rectificativas = 0;

		const productMap = new Map<string, {
			product_name: string;
			product_id: string | null;
			cost_center: string | null;
			unit: "unit" | "weight";
			quantity: number;
			cash_quantity: number;
			card_quantity: number;
			total_gross: number;
			cash_gross: number;
			card_gross: number;
		}>();

		for (const inv of invoices) {
			if (inv.status === "cancelled") continue;

			const gross = parseFloat(inv.total_gross) || 0;
			const net = parseFloat(inv.total_net) || 0;
			const tax = parseFloat(inv.total_tax) || 0;

			totalGross += gross;
			totalNet += net;
			totalTax += tax;

			if (inv.invoice_type === "ticket") tickets++;
			else if (inv.invoice_type === "factura") facturas++;
			else if (inv.invoice_type === "rectificativa") rectificativas++;

			const isCash = inv.payments?.some((p) => p.method === "cash") ?? false;
			const isCard = inv.payments?.some((p) => p.method === "card") ?? false;

			if (isCash) totalCash += gross;
			if (isCard && !isCash) totalCard += gross;

			for (const item of inv.items ?? []) {
				const key = item.product_id ?? item.product_name;
				const existing = productMap.get(key);
				const qty = typeof item.quantity === "number" ? item.quantity : parseFloat(String(item.quantity));
				const itemGross = parseFloat(item.row_total_gross) || 0;

				if (existing) {
					existing.quantity += qty;
					existing.total_gross += itemGross;
					if (isCash) {
						existing.cash_quantity += qty;
						existing.cash_gross += itemGross;
					}
					if (isCard && !isCash) {
						existing.card_quantity += qty;
						existing.card_gross += itemGross;
					}
				} else {
					productMap.set(key, {
						product_name: item.product_name,
						product_id: item.product_id,
						cost_center: item.cost_center,
						unit: item.unit,
						quantity: qty,
						cash_quantity: isCash ? qty : 0,
						card_quantity: isCard && !isCash ? qty : 0,
						total_gross: itemGross,
						cash_gross: isCash ? itemGross : 0,
						card_gross: isCard && !isCash ? itemGross : 0,
					});
				}
			}
		}

		const transactionCount = tickets + facturas + rectificativas;

		return {
			period: {
				type: "daily",
				label: dateStr,
				from: dateStr,
				to: dateStr,
			},
			summary: {
				total_gross: totalGross.toFixed(2),
				total_net: totalNet.toFixed(2),
				total_tax: totalTax.toFixed(2),
				total_cash: totalCash.toFixed(2),
				total_card: totalCard.toFixed(2),
				transaction_count: transactionCount,
			},
			invoice_counts: { tickets, facturas, rectificativas },
			tax_breakdown: [],
			product_breakdown: Array.from(productMap.values()).map((p) => ({
				...p,
				quantity: p.quantity,
				total_gross: p.total_gross.toFixed(2),
				cash_gross: p.cash_gross.toFixed(2),
				card_gross: p.card_gross.toFixed(2),
			})),
			shifts: [],
		};
	}

	async function loadData() {
		try {
			const client = getAuthClient();
			const today = new Date();
			const todayStr = formatDate(today);

			// Load today's invoices directly (includes open shift)
			const todayInvoices = (await getInvoices(client as any, {
				dateFrom: todayStr + "T00:00:00",
				dateTo: todayStr + "T23:59:59",
			})) as Invoice[];

			todayReport = buildReportFromInvoices(todayInvoices, todayStr);

			// Load last 7 days for trend chart (use aggregated reports for past days)
			const promises = [];
			for (let i = 6; i >= 1; i--) {
				const d = new Date(today);
				d.setDate(d.getDate() - i);
				const dateStr = formatDate(d);
				promises.push(
					getReport(client as any, "daily", { date: dateStr })
						.then((r) => ({ date: dateStr, report: r }))
						.catch(() => null),
				);
			}
			const results = await Promise.all(promises);
			const days: { date: string; report: AggregatedReport }[] = [];
			for (const r of results) {
				if (r) days.push(r);
			}
			// Add today from invoices
			days.push({ date: todayStr, report: todayReport });
			weekReports = days;
		} catch (e: any) {
			error = e?.message ?? "Error al cargar los datos";
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadData();
	});
</script>

<DashboardShell activePage="overview">
	<div class="space-y-6">
		{#if loading}
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<div
					class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
				></div>
				Cargando datos...
			</div>
		{:else if error}
			<div
				class="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text"
			>
				{error}
			</div>
		{:else}
			<KpiCards report={todayReport} />

			<div class="grid gap-6 lg:grid-cols-3">
				<div class="lg:col-span-2">
					<RevenueChart reports={weekReports} />
				</div>
				<div>
					<PaymentPieChart report={todayReport} />
				</div>
			</div>

			<TopProductsChart report={todayReport} />
		{/if}
	</div>
</DashboardShell>
