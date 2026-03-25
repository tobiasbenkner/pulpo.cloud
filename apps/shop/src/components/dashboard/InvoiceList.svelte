<script lang="ts">
	import { onMount } from "svelte";
	import { getAuthClient } from "@pulpo/auth";
	import { getInvoices } from "@pulpo/cms";
	import type { Invoice } from "@pulpo/cms";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import InvoiceDetail from "./InvoiceDetail.svelte";
	import DatePicker from "./DatePicker.svelte";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import CalendarRange from "lucide-svelte/icons/calendar-range";

	let invoices: Invoice[] = $state([]);
	let loading = $state(true);
	let error: string | null = $state(null);

	// Filters
	let typeFilter = $state<"all" | "ticket" | "factura" | "rectificativa">(
		"all",
	);
	let dateFrom = $state("");
	let dateTo = $state("");
	let mode: "day" | "range" = $state("day");

	// Pagination
	let currentPage = $state(1);
	const pageSize = 25;

	// Detail sheet
	let selectedInvoice: Invoice | null = $state(null);
	let detailOpen = $state(false);

	// Helpers
	function toDateStr(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, "0");
		const day = String(d.getDate()).padStart(2, "0");
		return `${y}-${m}-${day}`;
	}

	function todayStr(): string {
		return toDateStr(new Date());
	}

	// Day mode: formatted label for current date
	let dayLabel = $derived.by(() => {
		if (!dateFrom) return "";
		const [y, m, d] = dateFrom.split("-").map(Number);
		const date = new Date(y, m - 1, d);
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		date.setHours(0, 0, 0, 0);

		const diff = Math.round(
			(today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
		);
		if (diff === 0) return "Hoy";
		if (diff === 1) return "Ayer";

		return date.toLocaleDateString("es-ES", {
			weekday: "long",
			day: "numeric",
			month: "long",
		});
	});

	let isToday = $derived(dateFrom === todayStr());

	function goDay(offset: number) {
		const [y, m, d] = dateFrom.split("-").map(Number);
		const date = new Date(y, m - 1, d);
		date.setDate(date.getDate() + offset);
		const str = toDateStr(date);
		dateFrom = str;
		dateTo = str;
	}

	function goToday() {
		const str = todayStr();
		dateFrom = str;
		dateTo = str;
	}

	function switchToRange() {
		mode = "range";
	}

	function switchToDay() {
		mode = "day";
		// Sync: set both to dateFrom
		dateTo = dateFrom;
	}

	// Filtered invoices
	let filtered = $derived.by(() => {
		let result = invoices;

		if (typeFilter !== "all") {
			result = result.filter((inv) => inv.invoice_type === typeFilter);
		}

		return result;
	});

	let totalPages = $derived(Math.max(1, Math.ceil(filtered.length / pageSize)));
	let paginated = $derived(
		filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
	);

	function fmt(value: string | undefined | null): string {
		if (!value) return "0,00 €";
		return (
			parseFloat(value).toLocaleString("es-ES", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " €"
		);
	}

	function fmtDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString("es-ES", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	}

	function typeLabel(type: Invoice["invoice_type"]): string {
		switch (type) {
			case "ticket":
				return "Ticket";
			case "factura":
				return "Factura";
			case "rectificativa":
				return "Rectificativa";
			default:
				return type;
		}
	}

	function typeVariant(
		type: Invoice["invoice_type"],
	): "default" | "secondary" | "destructive" | "outline" {
		switch (type) {
			case "ticket":
				return "secondary";
			case "factura":
				return "default";
			case "rectificativa":
				return "destructive";
			default:
				return "outline";
		}
	}

	function statusLabel(status: Invoice["status"]): string {
		switch (status) {
			case "paid":
				return "Pagada";
			case "cancelled":
				return "Anulada";
			case "rectificada":
				return "Rectificada";
			case "draft":
				return "Borrador";
			default:
				return status;
		}
	}

	function paymentMethod(inv: Invoice): string {
		if (!inv.payments || inv.payments.length === 0) return "—";
		const methods = inv.payments.map((p) =>
			p.method === "cash" ? "Efectivo" : "Tarjeta",
		);
		return [...new Set(methods)].join(" + ");
	}

	function openDetail(inv: Invoice) {
		selectedInvoice = inv;
		detailOpen = true;
	}

	async function loadInvoices() {
		loading = true;
		error = null;
		try {
			const client = getAuthClient();
			const query: any = {};
			if (dateFrom) query.dateFrom = dateFrom + "T00:00:00";
			if (dateTo) query.dateTo = dateTo + "T23:59:59";
			invoices = (await getInvoices(client as any, query)) as Invoice[];
		} catch (e: any) {
			error = e?.message ?? "Error al cargar las facturas";
		} finally {
			loading = false;
		}
	}

	// Reset page when filters change
	$effect(() => {
		typeFilter;
		currentPage = 1;
	});

	onMount(() => {
		const str = todayStr();
		dateFrom = str;
		dateTo = str;
		loadInvoices();
	});

	// Reload when dates change
	let prevDateFrom = "";
	let prevDateTo = "";
	$effect(() => {
		if (dateFrom !== prevDateFrom || dateTo !== prevDateTo) {
			prevDateFrom = dateFrom;
			prevDateTo = dateTo;
			if (dateFrom && dateTo) {
				currentPage = 1;
				loadInvoices();
			}
		}
	});


</script>

<!-- Date navigation + type filter -->
{#if mode === "day"}
	<div class="flex flex-wrap items-center gap-2">
		<Button variant="outline" size="icon" onclick={() => goDay(-1)}>
			<ChevronLeft class="size-4" />
		</Button>
		<span class="w-[200px] text-center text-sm font-medium capitalize">
			{dayLabel}
		</span>
		<Button
			variant="outline"
			size="icon"
			onclick={() => goDay(1)}
			disabled={isToday}
		>
			<ChevronRight class="size-4" />
		</Button>
		<Button variant="outline" size="sm" onclick={goToday}>
			Hoy
		</Button>
		<Button variant="outline" size="sm" onclick={switchToRange}>
			<CalendarRange class="mr-1.5 size-4" />
			Rango
		</Button>
		<div class="ml-auto">
			<select
				id="type-filter"
				bind:value={typeFilter}
				class="h-9 rounded-md border border-input bg-background px-3 text-sm"
			>
				<option value="all">Todos</option>
				<option value="ticket">Ticket</option>
				<option value="factura">Factura</option>
				<option value="rectificativa">Rectificativa</option>
			</select>
		</div>
	</div>
{:else}
	<div class="flex flex-wrap items-end gap-3">
		<DatePicker
			bind:value={dateFrom}
			label="Desde"
			placeholder="Fecha inicio"
		/>
		<DatePicker
			bind:value={dateTo}
			label="Hasta"
			placeholder="Fecha fin"
		/>
		<Button variant="outline" size="sm" onclick={switchToDay}>
			Día
		</Button>
		<div class="ml-auto">
			<select
				id="type-filter-range"
				bind:value={typeFilter}
				class="h-9 rounded-md border border-input bg-background px-3 text-sm"
			>
				<option value="all">Todos</option>
				<option value="ticket">Ticket</option>
				<option value="factura">Factura</option>
				<option value="rectificativa">Rectificativa</option>
			</select>
		</div>
	</div>
{/if}

<!-- Table -->
{#if loading}
	<div class="flex items-center gap-2 py-8 text-sm text-muted-foreground">
		<div
			class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
		Cargando facturas...
	</div>
{:else if error}
	<div
		class="rounded-lg border border-error-border bg-error-bg p-4 text-sm text-error-text"
	>
		{error}
	</div>
{:else if filtered.length === 0}
	<div class="py-8 text-center text-sm text-muted-foreground">
		No se encontraron facturas para los filtros seleccionados.
	</div>
{:else}
	<div class="rounded-lg border border-border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Número</Table.Head>
					<Table.Head>Fecha</Table.Head>
					<Table.Head>Tipo</Table.Head>
					<Table.Head>Estado</Table.Head>
					<Table.Head>Cliente</Table.Head>
					<Table.Head class="text-right">Bruto</Table.Head>
					<Table.Head>Pago</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each paginated as inv (inv.id)}
					<Table.Row
						class="cursor-pointer hover:bg-muted/50"
						onclick={() => openDetail(inv)}
					>
						<Table.Cell class="font-mono text-sm">
							{inv.invoice_number}
						</Table.Cell>
						<Table.Cell class="text-sm">
							{fmtDate(inv.date_created)}
						</Table.Cell>
						<Table.Cell>
							<Badge variant={typeVariant(inv.invoice_type)}>
								{typeLabel(inv.invoice_type)}
							</Badge>
						</Table.Cell>
						<Table.Cell class="text-sm">
							{statusLabel(inv.status)}
						</Table.Cell>
						<Table.Cell class="text-sm">
							{inv.customer_name ?? "—"}
						</Table.Cell>
						<Table.Cell class="text-right font-mono text-sm">
							{fmt(inv.total_gross)}
						</Table.Cell>
						<Table.Cell class="text-sm">
							{paymentMethod(inv)}
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination -->
	<div class="flex items-center justify-between text-sm text-muted-foreground">
		<span>
			{filtered.length}
			{filtered.length === 1 ? "factura" : "facturas"}
		</span>
		{#if totalPages > 1}
			<div class="flex items-center gap-2">
				<button
					onclick={() => (currentPage = Math.max(1, currentPage - 1))}
					disabled={currentPage === 1}
					class="flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-50"
				>
					<ChevronLeft class="size-4" />
				</button>
				<span>
					Página {currentPage} de {totalPages}
				</span>
				<button
					onclick={() =>
						(currentPage = Math.min(totalPages, currentPage + 1))}
					disabled={currentPage === totalPages}
					class="flex size-8 items-center justify-center rounded-md border border-input hover:bg-accent disabled:opacity-50"
				>
					<ChevronRight class="size-4" />
				</button>
			</div>
		{/if}
	</div>
{/if}

<!-- Detail Sheet -->
<InvoiceDetail bind:open={detailOpen} invoice={selectedInvoice} onRectificativa={loadInvoices} />
