<script lang="ts">
	import { onMount } from "svelte";
	import type { AggregatedReport } from "@pulpo/cms";
	import {
		Chart,
		DoughnutController,
		ArcElement,
		Tooltip,
		Legend,
	} from "chart.js";

	Chart.register(DoughnutController, ArcElement, Tooltip, Legend);

	let { report }: { report: AggregatedReport | null } = $props();

	let canvas = $state<HTMLCanvasElement>(null!);
	let chart: Chart | null = null;

	function buildChart() {
		if (chart) chart.destroy();
		if (!canvas || !report) return;

		const cash = parseFloat(report.summary.total_cash) || 0;
		const card = parseFloat(report.summary.total_card) || 0;

		if (cash === 0 && card === 0) return;

		chart = new Chart(canvas, {
			type: "doughnut",
			data: {
				labels: ["Efectivo", "Tarjeta"],
				datasets: [
					{
						data: [cash, card],
						backgroundColor: ["#1a202c", "#c2b280"],
						borderWidth: 0,
						hoverOffset: 4,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: "65%",
				plugins: {
					legend: {
						position: "bottom",
						labels: {
							padding: 16,
							usePointStyle: true,
							pointStyle: "circle",
						},
					},
					tooltip: {
						callbacks: {
							label(ctx) {
								const val = ctx.parsed;
								const total = cash + card;
								const pct =
									total > 0 ? ((val / total) * 100).toFixed(1) : "0";
								return (
									ctx.label +
									": " +
									val.toLocaleString("es-ES", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}) +
									" € (" +
									pct +
									"%)"
								);
							},
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
		Métodos de pago
	</h3>
	{#if !report || (parseFloat(report.summary.total_cash) === 0 && parseFloat(report.summary.total_card) === 0)}
		<div class="flex h-64 items-center justify-center">
			<p class="text-sm text-muted-foreground">Sin datos de pago hoy</p>
		</div>
	{:else}
		<div class="h-64">
			<canvas bind:this={canvas}></canvas>
		</div>
	{/if}
</div>
