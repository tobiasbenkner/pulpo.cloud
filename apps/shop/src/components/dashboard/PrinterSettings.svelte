<script lang="ts">
	import { onMount } from "svelte";
	import {
		getPrinters,
		createPrinter,
		updatePrinter,
		deletePrinter,
	} from "../../lib/api";
	import type { Printer } from "../../lib/types";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash2 from "lucide-svelte/icons/trash-2";
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import Plus from "lucide-svelte/icons/plus";
	import PrinterIcon from "lucide-svelte/icons/printer";
	import Usb from "lucide-svelte/icons/usb";
	import Wifi from "lucide-svelte/icons/wifi";
	import Star from "lucide-svelte/icons/star";

	type View = "list" | "create" | "edit";

	let loading = $state(true);
	let view = $state<View>("list");
	let printers = $state<Printer[]>([]);
	let error: string | null = $state(null);
	let deleteConfirmId = $state<string | null>(null);
	let deleting = $state(false);

	// Form
	let saving = $state(false);
	let formError = $state("");
	let editId = $state("");
	let formName = $state("");
	let formConnection = $state<"USB" | "IP">("USB");
	let formIp = $state("");
	let formPort = $state<number | null>(9100);
	let formWidth = $state<number | null>(48);
	let formEncoding = $state("CP858");
	let formReplaceAccents = $state(false);
	let formFeed = $state<number | null>(3);
	let formVendorId = $state<number | null>(null);
	let formProductId = $state<number | null>(null);
	let formIsDefault = $state(false);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			printers = await getPrinters();
		} catch (e: any) {
			error = e?.message ?? "Error al cargar impresoras";
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formName = "";
		formConnection = "USB";
		formIp = "";
		formPort = 9100;
		formWidth = 48;
		formEncoding = "CP858";
		formReplaceAccents = false;
		formFeed = 3;
		formVendorId = null;
		formProductId = null;
		formIsDefault = false;
		formError = "";
		editId = "";
	}

	function showCreate() {
		resetForm();
		if (printers.length === 0) formIsDefault = true;
		view = "create";
	}

	function showEdit(p: Printer) {
		resetForm();
		editId = p.id;
		formName = p.name;
		formConnection = p.connection ?? "USB";
		formIp = p.ip ?? "";
		formPort = p.port ?? 9100;
		formWidth = p.width ?? 48;
		formEncoding = p.encoding ?? "CP858";
		formReplaceAccents = p.replace_accents;
		formFeed = p.feed ?? 3;
		formVendorId = p.vendor_id;
		formProductId = p.product_id;
		formIsDefault = p.is_default;
		view = "edit";
	}

	function backToList() {
		view = "list";
		deleteConfirmId = null;
		resetForm();
	}

	async function handleSave() {
		formError = "";
		if (!formName.trim()) {
			formError = "El nombre es obligatorio.";
			return;
		}
		if (formConnection === "IP" && !formIp.trim()) {
			formError = "La direccion IP es obligatoria para conexion IP.";
			return;
		}

		saving = true;
		try {
			const data: Partial<Printer> = {
				name: formName.trim(),
				connection: formConnection,
				ip: formConnection === "IP" ? formIp.trim() : null,
				port: formConnection === "IP" ? formPort : null,
				width: formWidth,
				encoding: formEncoding,
				replace_accents: formReplaceAccents,
				feed: formFeed,
				vendor_id: formConnection === "USB" ? formVendorId : null,
				product_id: formConnection === "USB" ? formProductId : null,
				is_default: formIsDefault,
			};

			if (view === "create") {
				await createPrinter(data);
			} else {
				await updatePrinter(editId, data);
			}
			await loadData();
			backToList();
		} catch (e: any) {
			formError = e?.message ?? "Error al guardar";
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		if (deleteConfirmId !== id) {
			deleteConfirmId = id;
			return;
		}
		deleting = true;
		try {
			await deletePrinter(id);
			await loadData();
			deleteConfirmId = null;
		} catch (e: any) {
			error = e?.message ?? "Error al eliminar";
		} finally {
			deleting = false;
		}
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-12">
		<div
			class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
	</div>
{:else if view === "list"}
	<div class="mt-4 space-y-4">
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				{printers.length}
				{printers.length === 1 ? "impresora" : "impresoras"}
			</p>
			<Button size="sm" onclick={showCreate}>
				<Plus class="size-4" />
				Nueva impresora
			</Button>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		{#if printers.length === 0}
			<div class="rounded-lg border border-dashed border-border py-12 text-center">
				<PrinterIcon class="mx-auto size-8 text-muted-foreground/40" />
				<p class="mt-2 text-sm text-muted-foreground">
					No hay impresoras configuradas.
				</p>
			</div>
		{:else}
			<div class="grid gap-3 sm:grid-cols-2">
				{#each printers as printer (printer.id)}
					<div class="rounded-lg border border-border bg-card p-4">
						<div class="flex items-start justify-between">
							<div class="flex items-center gap-3">
								<div class="flex size-10 items-center justify-center rounded-lg bg-muted">
									{#if printer.connection === "USB"}
										<Usb class="size-5 text-muted-foreground" />
									{:else}
										<Wifi class="size-5 text-muted-foreground" />
									{/if}
								</div>
								<div>
									<div class="flex items-center gap-1.5">
										<span class="text-sm font-semibold">{printer.name}</span>
										{#if printer.is_default}
											<Star class="size-3.5 fill-amber-400 text-amber-400" />
										{/if}
									</div>
									<p class="text-xs text-muted-foreground">
										{printer.connection}
										{#if printer.connection === "IP" && printer.ip}
											 — {printer.ip}:{printer.port ?? 9100}
										{/if}
									</p>
								</div>
							</div>
							<div class="flex items-center gap-1">
								{#if deleteConfirmId === printer.id}
									<Button
										variant="destructive"
										size="sm"
										onclick={() => handleDelete(printer.id)}
										disabled={deleting}
									>
										{deleting ? "..." : "Confirmar"}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => (deleteConfirmId = null)}
									>
										Cancelar
									</Button>
								{:else}
									<button
										class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
										onclick={() => showEdit(printer)}
										title="Editar"
									>
										<Pencil class="size-4" />
									</button>
									<button
										class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
										onclick={() => handleDelete(printer.id)}
										title="Eliminar"
									>
										<Trash2 class="size-4" />
									</button>
								{/if}
							</div>
						</div>
						<div class="mt-3 flex flex-wrap gap-1.5">
							<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
								{printer.width ?? 48} cols
							</span>
							<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
								{printer.encoding ?? "CP858"}
							</span>
							<span class="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
								Feed: {printer.feed ?? 3}
							</span>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{:else}
	<div class="mt-4 max-w-2xl">
		<button
			class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			onclick={backToList}
		>
			<ArrowLeft class="size-4" />
			Volver a impresoras
		</button>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="space-y-6">
				<!-- General -->
				<div class="rounded-lg border border-border bg-card">
					<div class="flex items-center gap-2 border-b border-border px-5 py-3">
						<PrinterIcon class="size-4 text-muted-foreground" />
						<h3 class="text-sm font-semibold">
							{view === "create" ? "Nueva impresora" : "Editar impresora"}
						</h3>
					</div>
					<div class="space-y-4 p-5">
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-1.5">
								<label for="pr-name" class="text-sm font-medium">Nombre</label>
								<Input id="pr-name" bind:value={formName} placeholder="Ej. Barra, Cocina" required />
							</div>
							<div class="space-y-1.5">
								<label class="text-sm font-medium">Conexion</label>
								<Select.Root type="single" bind:value={formConnection}>
									<Select.Trigger class="w-full">
										{formConnection === "USB" ? "USB" : "Red (IP)"}
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="USB" label="USB">USB</Select.Item>
										<Select.Item value="IP" label="Red (IP)">Red (IP)</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>

						{#if formConnection === "IP"}
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-1.5">
									<label for="pr-ip" class="text-sm font-medium">Direccion IP</label>
									<Input id="pr-ip" bind:value={formIp} placeholder="192.168.1.100" required />
								</div>
								<div class="space-y-1.5">
									<label for="pr-port" class="text-sm font-medium">Puerto</label>
									<Input id="pr-port" type="number" bind:value={formPort} placeholder="9100" />
								</div>
							</div>
						{:else}
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-1.5">
									<label for="pr-vendor" class="text-sm font-medium">Vendor ID</label>
									<Input id="pr-vendor" type="number" bind:value={formVendorId} placeholder="8137" />
								</div>
								<div class="space-y-1.5">
									<label for="pr-product" class="text-sm font-medium">Product ID</label>
									<Input id="pr-product" type="number" bind:value={formProductId} placeholder="8214" />
								</div>
							</div>
						{/if}

						<div class="flex items-center gap-2.5">
							<input
								id="pr-default"
								type="checkbox"
								bind:checked={formIsDefault}
								class="size-4 rounded border-input accent-primary"
							/>
							<label for="pr-default" class="text-sm font-medium">Impresora por defecto</label>
						</div>
					</div>
				</div>

				<!-- Advanced -->
				<div class="rounded-lg border border-border bg-card">
					<div class="flex items-center gap-2 border-b border-border px-5 py-3">
						<h3 class="text-sm font-semibold">Configuracion avanzada</h3>
					</div>
					<div class="space-y-4 p-5">
						<div class="grid gap-4 sm:grid-cols-3">
							<div class="space-y-1.5">
								<label for="pr-width" class="text-sm font-medium">Ancho (columnas)</label>
								<Input id="pr-width" type="number" bind:value={formWidth} placeholder="48" />
							</div>
							<div class="space-y-1.5">
								<label for="pr-encoding" class="text-sm font-medium">Codificacion</label>
								<Input id="pr-encoding" bind:value={formEncoding} placeholder="CP858" />
							</div>
							<div class="space-y-1.5">
								<label for="pr-feed" class="text-sm font-medium">Lineas de avance</label>
								<Input id="pr-feed" type="number" bind:value={formFeed} placeholder="3" />
							</div>
						</div>
						<div class="flex items-center gap-2.5">
							<input
								id="pr-accents"
								type="checkbox"
								bind:checked={formReplaceAccents}
								class="size-4 rounded border-input accent-primary"
							/>
							<label for="pr-accents" class="text-sm font-medium">Reemplazar acentos</label>
						</div>
					</div>
				</div>
			</div>

			{#if formError}
				<div class="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
					<p class="text-sm text-destructive">{formError}</p>
				</div>
			{/if}

			<div class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5">
				<Button variant="outline" type="button" onclick={backToList}>Cancelar</Button>
				<Button type="submit" disabled={saving}>
					{saving ? "Guardando..." : view === "create" ? "Crear impresora" : "Guardar cambios"}
				</Button>
			</div>
		</form>
	</div>
{/if}
