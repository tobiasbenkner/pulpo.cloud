<script lang="ts">
	import { onMount } from "svelte";
	import type { AggregatedReport } from "@pulpo/cms";
	import {
		Chart,
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip,
	} from "chart.js";

	Chart.register(
		LineController,
		LineElement,
		PointElement,
		LinearScale,
		CategoryScale,
		Filler,
		Tooltip,
	);

	let { reports }: { reports: { date: string; report: AggregatedReport }[] } =
		$props();

	let canvas = $state<HTMLCanvasElement>(null!);
	let chart: Chart | null = null;

	function formatDateLabel(dateStr: string): string {
		const d = new Date(dateStr + "T00:00:00");
		return d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" });
	}

	function buildChart() {
		if (chart) chart.destroy();
		if (!canvas || reports.length === 0) return;

		const labels = reports.map((r) => formatDateLabel(r.date));
		const data = reports.map((r) => parseFloat(r.report.summary.total_gross));

		const style = getComputedStyle(document.documentElement);
		const primaryColor = style.getPropertyValue("--primary").trim();

		chart = new Chart(canvas, {
			type: "line",
			data: {
				labels,
				datasets: [
					{
						label: "Ventas brutas",
						data,
						borderColor: primaryColor || "#1a202c",
						backgroundColor: (primaryColor || "#1a202c") + "15",
						borderWidth: 2,
						fill: true,
						tension: 0.3,
						pointRadius: 4,
						pointHoverRadius: 6,
					},
				],
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					tooltip: {
						callbacks: {
							label(ctx) {
								return (
									ctx.parsed.y.toLocaleString("es-ES", {
										minimumFractionDigits: 2,
										maximumFractionDigits: 2,
									}) + " €"
								);
							},
						},
					},
				},
				scales: {
					y: {
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
					x: {
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
		// rebuild when reports change
		if (reports && canvas) buildChart();
	});
</script>

<div class="rounded-lg border border-border bg-card p-6">
	<h3 class="mb-4 text-sm font-medium text-muted-foreground">
		Ventas últimos 7 días
	</h3>
	<div class="h-64">
		<canvas bind:this={canvas}></canvas>
	</div>
</div>
