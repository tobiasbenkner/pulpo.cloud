<script lang="ts">
	import { onMount } from "svelte";
	import { getAuthClient } from "@pulpo/auth";
	import { getReport } from "@pulpo/cms";
	import type { AggregatedReport } from "@pulpo/cms";
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

	async function loadData() {
		try {
			const client = getAuthClient();
			const today = new Date();
			const todayStr = formatDate(today);

			// Load today's report
			todayReport = await getReport(client as any, "daily", {
				date: todayStr,
			});

			// Load last 7 days for trend chart
			const days: { date: string; report: AggregatedReport }[] = [];
			const promises = [];
			for (let i = 6; i >= 0; i--) {
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
			for (const r of results) {
				if (r) days.push(r);
			}
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
