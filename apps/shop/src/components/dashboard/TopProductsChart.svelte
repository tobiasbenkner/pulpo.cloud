<script lang="ts">
	import { onMount } from "svelte";
	import type { AggregatedReport } from "../../lib/types";
	import {
		Chart,
		BarController,
		BarElement,
		LinearScale,
		CategoryScale,
		Tooltip,
	} from "chart.js";

	Chart.register(BarController, BarElement, LinearScale, CategoryScale, Tooltip);

	let { report }: { report: AggregatedReport | null } = $props();

	let canvas = $state<HTMLCanvasElement>(null!);
	let chart: Chart | null = null;

	function buildChart() {
		if (chart) chart.destroy();
		if (!canvas || !report || report.product_breakdown.length === 0) return;

		// Sort by total_gross descending and take top 10
		const sorted = [...report.product_breakdown]
			.sort(
				(a, b) => parseFloat(b.total_gross) - parseFloat(a.total_gross),
			)
			.slice(0, 10);

		const labels = sorted.map((p) => p.product_name);
		const data = sorted.map((p) => parseFloat(p.total_gross));
		const cashData = sorted.map((p) => parseFloat(p.cash_gross));
		const cardData = sorted.map((p) => parseFloat(p.card_gross));

		chart = new Chart(canvas, {
			type: "bar",
			data: {
				labels,
				datasets: [
					{
						label: "Efectivo",
						data: cashData,
						backgroundColor: "#10b981",
						borderRadius: 4,
					},
					{
						label: "Tarjeta",
						data: cardData,
						backgroundColor: "#6366f1",
						borderRadius: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				indexAxis: "y",
				plugins: {
					tooltip: {
						callbacks: {
							label(ctx) {
								return (
									ctx.dataset.label +
									": " +
									ctx.parsed.x.toLocaleString("es-ES", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}) +
									" €"
								);
							},
						},
					},
				},
				scales: {
					x: {
						stacked: true,
						beginAtZero: true,
						ticks: {
							callback(value) {
								return value + " €";
							},
						},
						grid: {
							color: "#e2e8f020",
						},
					},
					y: {
						stacked: true,
						grid: {
							display: false,
						},
					},
				},
			},
		});
	}

	onMount(() => {
		buildChart();
		return () => chart?.destroy();
	});

	$effect(() => {
		if (report && canvas) buildChart();
	});
</script>

<div class="rounded-lg border border-border bg-card p-6">
	<h3 class="mb-4 text-sm font-medium text-muted-foreground">
		Top 10 productos del día
	</h3>
	{#if !report || report.product_breakdown.length === 0}
		<div class="flex h-48 items-center justify-center">
			<p class="text-sm text-muted-foreground">
				Sin datos de productos hoy
			</p>
		</div>
	{:else}
		<div class="h-80">
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}
</div>
