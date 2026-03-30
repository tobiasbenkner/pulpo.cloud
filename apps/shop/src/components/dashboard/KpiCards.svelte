<script lang="ts">
	import type { AggregatedReport } from "../../lib/types";
	import TrendingUp from "lucide-svelte/icons/trending-up";
	import Receipt from "lucide-svelte/icons/receipt";
	import Banknote from "lucide-svelte/icons/banknote";
	import CreditCard from "lucide-svelte/icons/credit-card";

	let { report }: { report: AggregatedReport | null } = $props();

	function fmt(value: string | undefined): string {
		if (!value) return "0,00 €";
		return (
			parseFloat(value).toLocaleString("es-ES", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " €"
		);
	}

	let avgTicket = $derived.by(() => {
		if (!report || report.summary.transaction_count === 0) return "0,00 €";
		const avg =
			parseFloat(report.summary.total_gross) /
			report.summary.transaction_count;
		return (
			avg.toLocaleString("es-ES", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " €"
		);
	});

	const cards = $derived([
		{
			label: "Ventas del día",
			value: fmt(report?.summary.total_gross),
			desc: "Total bruto",
			icon: TrendingUp,
		},
		{
			label: "Transacciones",
			value: String(report?.summary.transaction_count ?? 0),
			desc: `${report?.invoice_counts.tickets ?? 0} tickets · ${report?.invoice_counts.facturas ?? 0} facturas · ${report?.invoice_counts.rectificativas ?? 0} rect.`,
			icon: Receipt,
		},
		{
			label: "Ticket medio",
			value: avgTicket,
			desc: "Promedio por transacción",
			icon: Banknote,
		},
		{
			label: "Efectivo / Tarjeta",
			value: `${fmt(report?.summary.total_cash)} / ${fmt(report?.summary.total_card)}`,
			desc: "Desglose por método de pago",
			icon: CreditCard,
		},
	]);
</script>

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
	{#each cards as card}
		<div class="rounded-lg border border-border bg-card p-6">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-muted-foreground">
					{card.label}
				</p>
				<card.icon class="size-4 text-muted-foreground" />
			</div>
			<p class="mt-2 text-2xl font-bold">{card.value}</p>
			<p class="mt-1 text-xs text-muted-foreground">{card.desc}</p>
		</div>
	{/each}
</div>
