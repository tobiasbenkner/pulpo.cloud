<script lang="ts">
	import type { Invoice, InvoiceItem } from "@pulpo/cms";
	import { getAuthClient } from "@pulpo/auth";
	import { rectifyInvoice, getInvoices } from "@pulpo/cms";
	import { printInvoice } from "../../stores/printerStore";
	import {
		RECTIFICATION_REASONS,
		type RectificationReason,
	} from "../../types/shop";
	import * as Sheet from "$lib/components/ui/sheet/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import Big from "big.js";
	import AlertTriangle from "lucide-svelte/icons/triangle-alert";
	import Check from "lucide-svelte/icons/check";
	import Printer from "lucide-svelte/icons/printer";
	import Banknote from "lucide-svelte/icons/banknote";
	import CreditCard from "lucide-svelte/icons/credit-card";

	let {
		open = $bindable(false),
		invoice,
		onComplete,
	}: {
		open: boolean;
		invoice: Invoice | null;
		onComplete?: () => void;
	} = $props();

	type View = "select" | "confirm" | "done";

	let view = $state<View>("select");
	let reason = $state<RectificationReason | "">("");
	let reasonDetail = $state("");
	let refundMethod = $state<"cash" | "card">("cash");
	let printReceipt = $state(false);
	let submitting = $state(false);
	let resultNumber = $state("");

	let selectedItems = $state<
		{
			item: InvoiceItem;
			selected: boolean;
			quantity: number;
			maxQuantity: number;
		}[]
	>([]);

	let allRectified = $derived(selectedItems.length === 0);
	let hasValidSelection = $derived(
		reason !== "" && selectedItems.some((s) => s.selected),
	);

	let refundTotal = $derived.by(() => {
		let total = new Big(0);
		for (const s of selectedItems) {
			if (!s.selected) continue;
			const proportional = new Big(s.item.row_total_gross)
				.times(s.quantity)
				.div(s.maxQuantity);
			total = total.plus(proportional);
		}
		return total.toFixed(2);
	});

	function fmt(value: string): string {
		return (
			parseFloat(value).toLocaleString("es-ES", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " €"
		);
	}

	let loading = $state(false);

	async function reset() {
		view = "select";
		reason = "";
		reasonDetail = "";
		refundMethod = invoice?.payments?.[0]?.method ?? "cash";
		printReceipt = false;
		submitting = false;
		resultNumber = "";
		await initItems();
	}

	async function initItems() {
		if (!invoice) {
			selectedItems = [];
			return;
		}

		loading = true;

		// Fetch existing rectificativas for this invoice
		const alreadyRectified = new Map<string, number>();
		try {
			const client = getAuthClient();
			const rectificativas = (await getInvoices(client as any, {
				originalInvoiceId: invoice.id,
			})) as Invoice[];

			for (const rect of rectificativas) {
				if (rect.invoice_type !== "rectificativa") continue;
				for (const ri of rect.items ?? []) {
					const key = `${ri.product_id ?? ""}|${ri.product_name}`;
					const prev = alreadyRectified.get(key) ?? 0;
					alreadyRectified.set(
						key,
						prev + Math.abs(parseInt(String(ri.quantity))),
					);
				}
			}
		} catch (e) {
			console.error("Error loading rectificativas:", e);
		}

		selectedItems = (invoice.items ?? [])
			.map((item) => {
				const key = `${item.product_id ?? ""}|${item.product_name}`;
				const origQty = Math.abs(
					item.unit === "weight"
						? parseFloat(String(item.quantity))
						: parseInt(String(item.quantity)),
				);
				const rectified = alreadyRectified.get(key) ?? 0;
				const remaining = Math.max(0, origQty - rectified);
				return {
					item,
					selected: remaining > 0,
					quantity: remaining,
					maxQuantity: remaining,
				};
			})
			.filter((s) => s.maxQuantity > 0);

		loading = false;
	}

	function toggleItem(index: number) {
		selectedItems[index].selected = !selectedItems[index].selected;
	}

	function adjustQuantity(index: number, delta: number) {
		const s = selectedItems[index];
		const newQty = s.quantity + delta;
		if (newQty < 1 || newQty > s.maxQuantity) return;
		selectedItems[index].quantity = newQty;
	}

	async function handleConfirm() {
		if (!invoice || submitting) return;
		submitting = true;

		try {
			const client = getAuthClient();
			const items = selectedItems
				.filter((s) => s.selected)
				.map((s) => ({
					product_id: s.item.product_id,
					product_name: s.item.product_name,
					quantity: s.quantity,
				}));

			const result = await rectifyInvoice(client as any, {
				original_invoice_id: invoice.id,
				reason: reason as string,
				reason_detail: reason === "otros" ? reasonDetail : undefined,
				payment_method: refundMethod,
				items,
			});

			resultNumber = result.rectificativa.invoice_number;

			if (printReceipt) {
				await printInvoice(result.rectificativa, {
					originalInvoiceNumber: invoice.invoice_number,
				});
			}

			view = "done";
		} catch (e) {
			console.error("Error al crear la rectificativa:", e);
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		open = false;
		if (view === "done" && onComplete) {
			onComplete();
		}
	}

	// Reset when invoice changes
	$effect(() => {
		if (invoice && open) {
			reset();
		}
	});
</script>

<Sheet.Root bind:open>
	<Sheet.Content side="right" class="w-full overflow-y-auto sm:!w-1/2">
		<Sheet.Header>
			<Sheet.Title>
				{#if view === "done"}
					Rectificativa creada
				{:else if view === "confirm"}
					Confirmar rectificativa
				{:else}
					Rectificativa
				{/if}
			</Sheet.Title>
			<Sheet.Description>
				{#if invoice}
					Factura original: {invoice.invoice_number}
				{/if}
			</Sheet.Description>
		</Sheet.Header>

		{#if invoice}
			<div class="space-y-5 px-4 pb-6">
				{#if loading}
					<div class="flex items-center gap-2 py-8 text-sm text-muted-foreground">
						<div class="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
						Cargando datos...
					</div>
				{:else if view === "select" && allRectified}
					<div class="flex flex-col items-center py-8">
						<div class="mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
							<Check class="size-7" />
						</div>
						<p class="text-sm font-medium">
							Todas las posiciones ya han sido rectificadas.
						</p>
						<p class="mt-1 text-xs text-muted-foreground">
							No quedan artículos por devolver.
						</p>
						<Button class="mt-6" variant="outline" onclick={handleClose}>
							Cerrar
						</Button>
					</div>
				{:else if view === "select"}
					<!-- Reason -->
					<div class="space-y-1.5">
						<label for="rect-reason" class="text-sm font-medium">
							Motivo <span class="text-destructive">*</span>
						</label>
						<select
							id="rect-reason"
							class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
							bind:value={reason}
						>
							<option value="" disabled>Seleccionar motivo...</option>
							{#each RECTIFICATION_REASONS as r}
								<option value={r.value}>{r.label}</option>
							{/each}
						</select>
					</div>

					{#if reason === "otros"}
						<textarea
							class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							rows="2"
							placeholder="Descripción del motivo..."
							bind:value={reasonDetail}
						></textarea>
					{/if}

					<!-- Items -->
					<div class="space-y-2">
						<p class="text-sm font-medium">Posiciones</p>
						<div class="rounded-md border border-border divide-y divide-border">
							{#each selectedItems as s, i}
								<div
									class="flex items-center gap-3 px-3 py-2.5 {s.selected ? '' : 'opacity-40'}"
								>
									<button
										class="flex size-5 shrink-0 items-center justify-center rounded border-2 transition-colors {s.selected
											? 'border-primary bg-primary text-primary-foreground'
											: 'border-input'}"
										onclick={() => toggleItem(i)}
									>
										{#if s.selected}
											<Check class="size-3" />
										{/if}
									</button>

									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium">
											{s.item.product_name}
										</p>
										<p class="text-xs text-muted-foreground">
											@ {fmt(s.item.price_gross_unit)}
										</p>
									</div>

									{#if s.selected}
										<div class="flex items-center gap-1">
											<button
												class="flex size-7 items-center justify-center rounded-md bg-muted text-sm font-bold hover:bg-accent disabled:opacity-30"
												disabled={s.quantity <= 1}
												onclick={() => adjustQuantity(i, -1)}
											>
												-
											</button>
											<span
												class="w-7 text-center text-sm font-bold tabular-nums"
											>
												{s.quantity}
											</span>
											<button
												class="flex size-7 items-center justify-center rounded-md bg-muted text-sm font-bold hover:bg-accent disabled:opacity-30"
												disabled={s.quantity >= s.maxQuantity}
												onclick={() => adjustQuantity(i, 1)}
											>
												+
											</button>
										</div>
									{/if}

									<span class="w-16 shrink-0 text-right text-sm font-mono">
										{#if s.selected}
											{new Big(s.item.row_total_gross)
												.times(s.quantity)
												.div(s.maxQuantity)
												.toFixed(2)}
										{:else}
											<span class="text-muted-foreground">
												{parseFloat(s.item.row_total_gross).toFixed(2)}
											</span>
										{/if}
									</span>
								</div>
							{/each}
						</div>
					</div>

					<!-- Refund method -->
					<div class="space-y-2">
						<p class="text-sm font-medium">Devolución por</p>
						<div class="flex gap-2">
							<Button
								variant={refundMethod === "cash" ? "default" : "outline"}
								size="sm"
								onclick={() => (refundMethod = "cash")}
							>
								<Banknote class="mr-1.5 size-4" />
								Efectivo
							</Button>
							<Button
								variant={refundMethod === "card" ? "default" : "outline"}
								size="sm"
								onclick={() => (refundMethod = "card")}
							>
								<CreditCard class="mr-1.5 size-4" />
								Tarjeta
							</Button>
						</div>
					</div>

					<!-- Print toggle -->
					<button
						class="flex w-full items-center gap-3 rounded-md border border-input px-3 py-2.5 text-sm transition-colors hover:bg-muted"
						onclick={() => (printReceipt = !printReceipt)}
					>
						<Printer
							class="size-4 {printReceipt ? 'text-foreground' : 'text-muted-foreground'}"
						/>
						<span class="flex-1 text-left font-medium {printReceipt ? '' : 'text-muted-foreground'}">
							Imprimir ticket
						</span>
						<div
							class="h-5 w-9 rounded-full p-0.5 transition-colors {printReceipt ? 'bg-primary' : 'bg-input'}"
						>
							<div
								class="size-4 rounded-full bg-white shadow transition-transform {printReceipt ? 'translate-x-4' : 'translate-x-0'}"
							></div>
						</div>
					</button>

					<!-- Refund total -->
					<div
						class="flex items-center justify-between rounded-md bg-destructive/10 px-4 py-3"
					>
						<span class="text-sm font-medium text-destructive">
							Importe a devolver
						</span>
						<span class="text-lg font-bold tabular-nums text-destructive">
							-{refundTotal} €
						</span>
					</div>

					<!-- Actions -->
					<div class="flex gap-3">
						<Button
							variant="outline"
							class="flex-1"
							onclick={handleClose}
						>
							Cancelar
						</Button>
						<Button
							class="flex-1"
							disabled={!hasValidSelection}
							onclick={() => (view = "confirm")}
						>
							Continuar
						</Button>
					</div>

				{:else if view === "confirm"}
					<!-- Summary -->
					<div class="rounded-md border border-border divide-y divide-border text-sm">
						<div class="px-4 py-3 bg-muted">
							<p class="text-xs text-muted-foreground">Motivo</p>
							<p class="font-medium">
								{RECTIFICATION_REASONS.find((r) => r.value === reason)?.label ?? reason}
								{#if reason === "otros" && reasonDetail}
									— {reasonDetail}
								{/if}
							</p>
						</div>
						<div class="px-4 py-3 bg-muted">
							<p class="text-xs text-muted-foreground">Devolución por</p>
							<p class="font-medium">
								{refundMethod === "cash" ? "Efectivo" : "Tarjeta"}
							</p>
						</div>
						{#each selectedItems.filter((s) => s.selected) as s}
							<div class="flex items-center justify-between px-4 py-2.5">
								<span>{s.quantity}x {s.item.product_name}</span>
								<span class="font-mono font-medium">
									-{new Big(s.item.row_total_gross)
										.times(s.quantity)
										.div(s.maxQuantity)
										.toFixed(2)} €
								</span>
							</div>
						{/each}
						<div
							class="flex items-center justify-between bg-destructive/10 px-4 py-3"
						>
							<span class="font-bold text-destructive">Total</span>
							<span class="text-lg font-bold tabular-nums text-destructive">
								-{refundTotal} €
							</span>
						</div>
					</div>

					<!-- Warning -->
					<div
						class="flex items-start gap-3 rounded-md bg-amber-50 px-4 py-3"
					>
						<AlertTriangle class="mt-0.5 size-5 shrink-0 text-amber-500" />
						<p class="text-sm text-amber-700">
							Esta acción es irreversible. Se creará una rectificativa y
							se ajustará el stock.
						</p>
					</div>

					<!-- Actions -->
					<div class="flex gap-3">
						<Button
							variant="outline"
							class="flex-1"
							disabled={submitting}
							onclick={() => (view = "select")}
						>
							Volver
						</Button>
						<Button
							variant="destructive"
							class="flex-1"
							disabled={submitting}
							onclick={handleConfirm}
						>
							{#if submitting}
								Procesando...
							{:else}
								Confirmar
							{/if}
						</Button>
					</div>

				{:else if view === "done"}
					<div class="flex flex-col items-center py-8">
						<div
							class="mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 text-green-600"
						>
							<Check class="size-8" />
						</div>
						<h3 class="text-xl font-bold">Rectificativa creada</h3>
						<p class="mt-1 text-sm text-muted-foreground">
							{resultNumber}
						</p>
						<Button class="mt-6" onclick={handleClose}>
							Cerrar
						</Button>
					</div>
				{/if}
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>
