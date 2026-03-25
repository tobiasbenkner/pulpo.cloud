<script lang="ts">
	import { onMount } from "svelte";
	import type { Invoice } from "@pulpo/cms";
	import { getAuthClient } from "@pulpo/auth";
	import { getInvoices } from "@pulpo/cms";
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { printInvoice } from "../../stores/printerStore";
	import RectificativaDialog from "./RectificativaDialog.svelte";
	import { resolveRectificationReason } from "../../types/shop";
	import Printer from "lucide-svelte/icons/printer";
	import Ban from "lucide-svelte/icons/ban";
	import FileWarning from "lucide-svelte/icons/file-warning";

	let {
		open = $bindable(false),
		invoice,
		onRectificativa,
	}: {
		open: boolean;
		invoice: Invoice | null;
		onRectificativa?: () => void;
	} = $props();

	let rectOpen = $state(false);
	let linkedRectificativas: Invoice[] = $state([]);
	let originalInvoiceNumber: string | null = $state(null);
	// Map: "product_id|product_name" → rectified quantity
	let rectifiedQuantities = $state(new Map<string, number>());

	// Load linked rectificativas when invoice changes
	$effect(() => {
		if (invoice && open) {
			loadLinkedRectificativas();
			loadOriginalInvoice();
		} else {
			linkedRectificativas = [];
			originalInvoiceNumber = null;
		}
	});

	async function loadOriginalInvoice() {
		if (!invoice?.original_invoice_id) {
			originalInvoiceNumber = null;
			return;
		}
		try {
			const client = getAuthClient();
			const { getInvoice } = await import("@pulpo/cms");
			const original = await getInvoice(client as any, invoice.original_invoice_id);
			originalInvoiceNumber = (original as Invoice).invoice_number;
		} catch {
			originalInvoiceNumber = null;
		}
	}

	async function loadLinkedRectificativas() {
		if (!invoice) return;
		// For a normal invoice: find its rectificativas
		// For a rectificativa: nothing (the original_invoice_id is shown below)
		if (invoice.invoice_type === "rectificativa") {
			linkedRectificativas = [];
			return;
		}
		try {
			const client = getAuthClient();
			const results = (await getInvoices(client as any, {
				originalInvoiceId: invoice.id,
			})) as Invoice[];
			linkedRectificativas = results.filter(
				(r) => r.invoice_type === "rectificativa",
			);

			// Build rectified quantities map
			const map = new Map<string, number>();
			for (const rect of linkedRectificativas) {
				for (const ri of rect.items ?? []) {
					const key = `${ri.product_id ?? ""}|${ri.product_name}`;
					const prev = map.get(key) ?? 0;
					map.set(key, prev + Math.abs(parseInt(String(ri.quantity))));
				}
			}
			rectifiedQuantities = map;
		} catch {
			linkedRectificativas = [];
			rectifiedQuantities = new Map();
		}
	}

	let printing = $state(false);

	async function onPrint() {
		if (!invoice) return;
		printing = true;
		try {
			await printInvoice(invoice);
		} catch (e) {
			console.error("Error al imprimir:", e);
		} finally {
			printing = false;
		}
	}

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
			weekday: "long",
			day: "numeric",
			month: "long",
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
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full overflow-y-auto sm:!w-1/2">
		<Sheet.Header>
			<Sheet.Title>
				{#if invoice}
					{invoice.invoice_number}
				{:else}
					Detalle
				{/if}
			</Sheet.Title>
			<Sheet.Description>
				{#if invoice}
					{fmtDate(invoice.date_created)}
				{/if}
			</Sheet.Description>
		</Sheet.Header>

		{#if invoice}
			<div class="space-y-6 px-4 pb-6">
				<!-- Header info -->
				<div class="flex flex-wrap items-center gap-2">
					<Badge variant={typeVariant(invoice.invoice_type)}>
						{typeLabel(invoice.invoice_type)}
					</Badge>
					<Badge variant="outline">
						{#if invoice.status === "paid"}
							Pagada
						{:else if invoice.status === "cancelled"}
							Anulada
						{:else if invoice.status === "rectificada"}
							Rectificada
						{:else}
							{invoice.status}
						{/if}
					</Badge>
					<div class="ml-auto flex gap-2">
						{#if invoice.status === "paid" && invoice.invoice_type !== "rectificativa"}
							<Button
								variant="outline"
								size="sm"
								onclick={() => { rectOpen = true; }}
							>
								<Ban class="mr-1.5 size-4" />
								Rectificar
							</Button>
						{/if}
						<Button
							variant="outline"
							size="sm"
							onclick={onPrint}
							disabled={printing}
						>
							<Printer class="mr-1.5 size-4" />
							{printing ? "Imprimiendo..." : "Imprimir"}
						</Button>
					</div>
				</div>

				<!-- Customer -->
				{#if invoice.customer_name}
					<div class="space-y-1">
						<h4 class="text-sm font-medium">Cliente</h4>
						<div class="rounded-md bg-muted p-3 text-sm">
							<p class="font-medium">{invoice.customer_name}</p>
							{#if invoice.customer_nif}
								<p class="text-muted-foreground">
									NIF: {invoice.customer_nif}
								</p>
							{/if}
							{#if invoice.customer_street}
								<p class="text-muted-foreground">
									{invoice.customer_street}
									{#if invoice.customer_zip || invoice.customer_city}
										, {invoice.customer_zip ?? ""}
										{invoice.customer_city ?? ""}
									{/if}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Items -->
				<div class="space-y-2">
					<h4 class="text-sm font-medium">Artículos</h4>
					<div class="rounded-md border border-border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Producto</Table.Head>
									<Table.Head class="text-right">Ud.</Table.Head>
									<Table.Head class="text-right">P/U</Table.Head>
									<Table.Head class="text-right">Total</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each invoice.items as item (item.id)}
									{@const key = `${item.product_id ?? ""}|${item.product_name}`}
									{@const rectQty = rectifiedQuantities.get(key) ?? 0}
									{@const origQty = Math.abs(item.unit === "weight" ? parseFloat(String(item.quantity)) : parseInt(String(item.quantity)))}
									{@const fullyRectified = rectQty >= origQty}
									{@const partiallyRectified = rectQty > 0 && rectQty < origQty}
									<Table.Row class={fullyRectified ? "opacity-50 line-through" : ""}>
										<Table.Cell class="text-sm">
											{item.product_name}
											{#if item.discount_type}
												<span class="text-xs text-muted-foreground">
													({item.discount_type === "percent"
														? item.discount_value + "%"
														: fmt(item.discount_value)} dto.)
												</span>
											{/if}
											{#if fullyRectified}
												<span class="ml-1.5 inline-flex items-center rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive no-underline">
													Rectificado
												</span>
											{:else if partiallyRectified}
												<span class="ml-1.5 inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 no-underline">
													{rectQty} de {origQty} rectificado
												</span>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-right font-mono text-sm">
											{item.unit === "weight"
												? parseFloat(String(item.quantity)).toFixed(3)
												: item.quantity}
										</Table.Cell>
										<Table.Cell class="text-right font-mono text-sm">
											{fmt(item.price_gross_unit)}
										</Table.Cell>
										<Table.Cell class="text-right font-mono text-sm">
											{fmt(item.row_total_gross)}
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>
				</div>

				<!-- Totals -->
				<div class="space-y-2">
					<h4 class="text-sm font-medium">Totales</h4>
					<div class="space-y-1 rounded-md bg-muted p-3 text-sm">
						{#if invoice.discount_type}
							<div class="flex justify-between text-muted-foreground">
								<span>Descuento</span>
								<span>
									{invoice.discount_type === "percent"
										? invoice.discount_value + "%"
										: fmt(invoice.discount_value)}
								</span>
							</div>
						{/if}
						<div class="flex justify-between text-muted-foreground">
							<span>Neto</span>
							<span class="font-mono">{fmt(invoice.total_net)}</span>
						</div>
						<div class="flex justify-between text-muted-foreground">
							<span>Impuestos</span>
							<span class="font-mono">{fmt(invoice.total_tax)}</span>
						</div>
						<div class="flex justify-between border-t pt-1 font-semibold">
							<span>Total</span>
							<span class="font-mono">{fmt(invoice.total_gross)}</span>
						</div>
					</div>
				</div>

				<!-- Tax breakdown -->
				{#if invoice.tax_breakdown && invoice.tax_breakdown.length > 0}
					<div class="space-y-2">
						<h4 class="text-sm font-medium">Desglose de impuestos</h4>
						<div class="space-y-1 text-sm">
							{#each invoice.tax_breakdown as tax}
								<div
									class="flex justify-between text-muted-foreground"
								>
									<span>{tax.rate}%</span>
									<span class="font-mono">
										Base: {fmt(tax.net)} · Cuota: {fmt(tax.tax)}
									</span>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Payments -->
				<div class="space-y-2">
					<h4 class="text-sm font-medium">Pagos</h4>
					{#each invoice.payments as payment (payment.id)}
						<div class="rounded-md bg-muted p-3 text-sm">
							<div class="flex justify-between">
								<span class="font-medium">
									{payment.method === "cash"
										? "Efectivo"
										: "Tarjeta"}
								</span>
								<span class="font-mono">{fmt(payment.amount)}</span>
							</div>
							{#if payment.method === "cash" && payment.tendered && parseFloat(payment.tendered) > parseFloat(payment.amount)}
								<div
									class="mt-1 flex justify-between text-muted-foreground"
								>
									<span>Entregado</span>
									<span class="font-mono">
										{fmt(payment.tendered)}
									</span>
								</div>
								<div
									class="flex justify-between text-muted-foreground"
								>
									<span>Cambio</span>
									<span class="font-mono">
										{fmt(payment.change)}
									</span>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<!-- Rectificativa reference (for rectificativas: link to original) -->
				{#if invoice.original_invoice_id}
					<div class="space-y-2">
						<h4 class="text-sm font-medium">Factura original</h4>
						<div class="rounded-md bg-muted p-3 text-sm">
							<p class="font-medium font-mono">
								{originalInvoiceNumber ?? "Cargando..."}
							</p>
							{#if invoice.rectification_reason}
								<p class="mt-1 text-muted-foreground">
									Motivo: {resolveRectificationReason(invoice.rectification_reason) ?? invoice.rectification_reason}
								</p>
							{/if}
						</div>
					</div>
				{/if}

				<!-- Linked rectificativas (for normal invoices) -->
				{#if linkedRectificativas.length > 0}
					<div class="space-y-2">
						<h4 class="text-sm font-medium">Rectificativas</h4>
						{#each linkedRectificativas as rect (rect.id)}
							<div class="flex items-center gap-3 rounded-md bg-destructive/5 px-3 py-2.5">
								<FileWarning class="size-4 shrink-0 text-destructive" />
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium font-mono">
										{rect.invoice_number}
									</p>
									<p class="text-xs text-muted-foreground">
										{new Date(rect.date_created).toLocaleDateString("es-ES", {
											day: "2-digit",
											month: "2-digit",
											year: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
								<span class="text-sm font-mono font-medium text-destructive">
									{fmt(rect.total_gross)}
								</span>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<RectificativaDialog
	bind:open={rectOpen}
	{invoice}
	onComplete={() => {
		rectOpen = false;
		open = false;
		onRectificativa?.();
	}}
/>
