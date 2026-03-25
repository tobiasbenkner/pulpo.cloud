<script lang="ts">
	import { onMount } from "svelte";
	import { getAuthClient } from "@pulpo/auth";
	import { getReport, getReportExcelUrl, DIRECTUS_URL } from "@pulpo/cms";
	import type { AggregatedReport } from "@pulpo/cms";
	import DashboardShell from "../DashboardShell.svelte";
	import ReportSummaryCard from "../ReportSummaryCard.svelte";
	import ProductBreakdownTable from "../ProductBreakdownTable.svelte";
	import ShiftsTable from "../ShiftsTable.svelte";
	import PaymentPieChart from "../PaymentPieChart.svelte";
	import TopProductsChart from "../TopProductsChart.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import Download from "lucide-svelte/icons/download";

	type Period = "daily" | "monthly" | "quarterly" | "yearly";

	let activeTab = $state<Period>("daily");
	let report = $state<AggregatedReport | null>(null);
	let loading = $state(true);
	let exporting = $state(false);

	// Daily
	let selectedDate = $state(todayStr());

	// Monthly
	let selectedYear = $state(new Date().getFullYear());
	let selectedMonth = $state(new Date().getMonth() + 1);

	// Quarterly
	let selectedQYear = $state(new Date().getFullYear());
	let selectedQuarter = $state(Math.ceil((new Date().getMonth() + 1) / 3));

	// Yearly
	let selectedYYear = $state(new Date().getFullYear());

	function todayStr(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function toDateStr(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	}

	// Labels
	let dayLabel = $derived.by(() => {
		const [y, m, d] = selectedDate.split("-").map(Number);
		const date = new Date(y, m - 1, d);
		return date.toLocaleDateString("es-ES", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	});

	let monthLabel = $derived(
		new Date(selectedYear, selectedMonth - 1).toLocaleDateString("es-ES", {
			month: "long",
			year: "numeric",
		}),
	);

	let quarterLabel = $derived(
		`T${selectedQuarter} ${selectedQYear}`,
	);

	let yearLabel = $derived(String(selectedYYear));

	let isDayToday = $derived(selectedDate === todayStr());

	// Navigation
	function prevDay() {
		const d = new Date(selectedDate + "T12:00:00");
		d.setDate(d.getDate() - 1);
		selectedDate = toDateStr(d);
	}
	function nextDay() {
		const d = new Date(selectedDate + "T12:00:00");
		d.setDate(d.getDate() + 1);
		if (toDateStr(d) > todayStr()) return;
		selectedDate = toDateStr(d);
	}
	function goToday() {
		selectedDate = todayStr();
	}

	function prevMonth() {
		if (selectedMonth === 1) { selectedMonth = 12; selectedYear--; }
		else selectedMonth--;
	}
	function nextMonth() {
		if (selectedMonth === 12) { selectedMonth = 1; selectedYear++; }
		else selectedMonth++;
	}

	function prevQuarter() {
		if (selectedQuarter === 1) { selectedQuarter = 4; selectedQYear--; }
		else selectedQuarter--;
	}
	function nextQuarter() {
		if (selectedQuarter === 4) { selectedQuarter = 1; selectedQYear++; }
		else selectedQuarter++;
	}

	function prevYear() { selectedYYear--; }
	function nextYear() { selectedYYear++; }

	// Build params
	function getParams(): Record<string, string> {
		switch (activeTab) {
			case "daily":
				return { date: selectedDate };
			case "monthly":
				return { year: String(selectedYear), month: String(selectedMonth) };
			case "quarterly":
				return { year: String(selectedQYear), quarter: String(selectedQuarter) };
			case "yearly":
				return { year: String(selectedYYear) };
		}
	}

	async function loadReport() {
		loading = true;
		try {
			const client = getAuthClient();
			report = await getReport(client as any, activeTab, getParams());
		} catch (e) {
			console.error("Error loading report:", e);
			report = null;
		} finally {
			loading = false;
		}
	}

	async function exportExcel() {
		if (!report || report.summary.transaction_count === 0) return;
		exporting = true;
		try {
			const path = getReportExcelUrl(activeTab, getParams());
			const token = document.cookie
				.split("; ")
				.find((c) => c.startsWith("directus_session_token="))
				?.split("=")[1];
			const url = `${DIRECTUS_URL}${path}${path.includes("?") ? "&" : "?"}access_token=${token}`;
			window.open(url, "_blank");
		} finally {
			exporting = false;
		}
	}

	// Reactive loading
	let prevKey = "";
	$effect(() => {
		const key = `${activeTab}|${JSON.stringify(getParams())}`;
		if (key !== prevKey) {
			prevKey = key;
			loadReport();
		}
	});

	let hasData = $derived(
		report && report.summary && report.summary.transaction_count > 0,
	);
</script>

<DashboardShell activePage="reports">
	<div class="space-y-6">
		<!-- Period type nav -->
		<nav class="flex gap-6 border-b border-border">
			{#each [
				{ value: "daily", label: "Día" },
				{ value: "monthly", label: "Mes" },
				{ value: "quarterly", label: "Trimestre" },
				{ value: "yearly", label: "Año" },
			] as tab (tab.value)}
				<button
					class="relative pb-3 text-sm font-medium transition-colors {activeTab === tab.value
						? 'text-foreground'
						: 'text-muted-foreground hover:text-foreground'}"
					onclick={() => (activeTab = tab.value)}
				>
					{tab.label}
					{#if activeTab === tab.value}
						<span class="absolute inset-x-0 bottom-0 h-0.5 bg-foreground rounded-full"></span>
					{/if}
				</button>
			{/each}
		</nav>

		<!-- Date navigator -->
		<div class="flex items-center gap-2">
			<Button
				variant="outline"
				size="icon"
				class="size-8"
				onclick={() => {
					if (activeTab === "daily") prevDay();
					else if (activeTab === "monthly") prevMonth();
					else if (activeTab === "quarterly") prevQuarter();
					else prevYear();
				}}
			>
				<ChevronLeft class="size-4" />
			</Button>
			<span class="w-[250px] text-center text-sm font-medium capitalize">
				{#if activeTab === "daily"}
					{dayLabel}
				{:else if activeTab === "monthly"}
					{monthLabel}
				{:else if activeTab === "quarterly"}
					{quarterLabel}
				{:else}
					{yearLabel}
				{/if}
			</span>
			<Button
				variant="outline"
				size="icon"
				class="size-8"
				onclick={() => {
					if (activeTab === "daily") nextDay();
					else if (activeTab === "monthly") nextMonth();
					else if (activeTab === "quarterly") nextQuarter();
					else nextYear();
				}}
				disabled={activeTab === "daily" && isDayToday}
			>
				<ChevronRight class="size-4" />
			</Button>
			{#if activeTab === "daily"}
				<Button variant="outline" size="sm" onclick={goToday}>
					Hoy
				</Button>
			{/if}
			{#if hasData}
				<div class="ml-auto">
					<Button
						variant="outline"
						size="sm"
						onclick={exportExcel}
						disabled={exporting}
					>
						<Download class="mr-1.5 size-4" />
						{exporting ? "Exportando..." : "Excel"}
					</Button>
				</div>
			{/if}
		</div>

		<!-- Content -->
		{#if loading}
			<div class="flex items-center gap-2 py-8 text-sm text-muted-foreground">
				<div class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
				Cargando informe...
			</div>
		{:else if !hasData}
			<div class="py-8 text-center text-sm text-muted-foreground">
				No hay datos para este período.
			</div>
		{:else if report}
			<ReportSummaryCard {report} />

			<div class="grid gap-6 lg:grid-cols-3">
				<div class="lg:col-span-2">
					<TopProductsChart {report} />
				</div>
				<div>
					<PaymentPieChart {report} />
				</div>
			</div>

			<ProductBreakdownTable
				products={report.product_breakdown}
				title="Productos del período"
			/>

			{#if activeTab === "daily" && report.shifts?.length > 0}
				<ShiftsTable shifts={report.shifts} />
			{/if}
		{/if}
	</div>
</DashboardShell>
