<script lang="ts">
	import type { Invoice } from "@pulpo/cms";
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { printInvoice } from "../../stores/printerStore";
	import Printer from "lucide-svelte/icons/printer";

	let {
		open = $bindable(false),
		invoice,
	}: {
		open: boolean;
		invoice: Invoice | null;
	} = $props();

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
	<Sheet.Content side="right" class="w-full overflow-y-auto sm:max-w-lg">
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
					<Button
						variant="outline"
						size="sm"
						class="ml-auto"
						onclick={onPrint}
						disabled={printing}
					>
						<Printer class="mr-1.5 size-4" />
						{printing ? "Imprimiendo..." : "Imprimir"}
					</Button>
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
									<Table.Row>
										<Table.Cell class="text-sm">
											{item.product_name}
											{#if item.discount_type}
												<span class="text-xs text-muted-foreground">
													({item.discount_type === "percent"
														? item.discount_value + "%"
														: fmt(item.discount_value)} dto.)
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

				<!-- Rectificativa reference -->
				{#if invoice.original_invoice_id}
					<div class="space-y-1">
						<h4 class="text-sm font-medium">Factura original</h4>
						<p class="text-sm text-muted-foreground">
							ID: {invoice.original_invoice_id}
						</p>
						{#if invoice.rectification_reason}
							<p class="text-sm text-muted-foreground">
								Motivo: {invoice.rectification_reason}
							</p>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
