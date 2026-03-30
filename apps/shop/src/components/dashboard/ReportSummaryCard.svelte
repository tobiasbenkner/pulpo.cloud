<script lang="ts">
	import type { AggregatedReport } from "../../lib/types";

	let {
		report,
		taxLabel = "IGIC",
	}: {
		report: AggregatedReport;
		taxLabel?: string;
	} = $props();

	function fmt(v: string | number): string {
		const n = typeof v === "string" ? parseFloat(v) : v;
		return (
			n.toLocaleString("es-ES", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " €"
		);
	}

	let s = $derived(report.summary);
	let ic = $derived(report.invoice_counts);
	let tb = $derived(report.tax_breakdown ?? []);
</script>

<div class="rounded-lg border border-border bg-card overflow-hidden">
	<!-- Hero total -->
	<div class="px-5 pt-5 pb-4">
		<p class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
			Total bruto
		</p>
		<p class="mt-1 text-3xl font-extrabold tabular-nums">
			{fmt(s.total_gross)}
		</p>
	</div>

	<!-- Metrics row -->
	<div class="grid grid-cols-5 border-t border-border">
		{#each [
			{ label: "Neto", value: fmt(s.total_net) },
			{ label: "Impuestos", value: fmt(s.total_tax) },
			{ label: "Efectivo", value: fmt(s.total_cash) },
			{ label: "Tarjeta", value: fmt(s.total_card) },
		] as metric}
			<div class="px-4 py-3">
				<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
					{metric.label}
				</p>
				<p class="text-lg font-bold tabular-nums">{metric.value}</p>
			</div>
		{/each}
		<div class="px-4 py-3">
			<p class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				Transacciones
			</p>
			<p class="text-lg font-bold tabular-nums">{s.transaction_count}</p>
			<p class="flex gap-1.5 text-xs text-muted-foreground mt-0.5">
				<span>{ic.tickets} tick.</span>
				<span>{ic.facturas} fact.</span>
				{#if ic.rectificativas > 0}
					<span class="text-destructive">{ic.rectificativas} rect.</span>
				{/if}
			</p>
		</div>
	</div>

	<!-- Tax breakdown -->
	{#if tb.length > 0}
		<div class="flex flex-wrap gap-x-5 gap-y-1 border-t border-border bg-muted/50 px-5 py-3">
			{#each tb as entry}
				<span class="text-sm text-muted-foreground">
					{taxLabel}
					{parseFloat(entry.rate)}%:
					<span class="font-semibold text-foreground">{fmt(entry.net)}</span>
					<span class="mx-0.5">+</span>
					<span class="font-semibold text-foreground">{fmt(entry.tax)}</span>
				</span>
			{/each}
		</div>
	{/if}
</div>
