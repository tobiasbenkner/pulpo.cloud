<script lang="ts">
	import { onMount } from "svelte";
	import {
		getCostCenters,
		createCostCenter,
		updateCostCenter,
		deleteCostCenter,
	} from "../../lib/api";
	import type { CostCenter } from "../../lib/types";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash2 from "lucide-svelte/icons/trash-2";
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import Plus from "lucide-svelte/icons/plus";

	type View = "list" | "create" | "edit";

	let loading = $state(true);
	let view = $state<View>("list");
	let costCenters = $state<CostCenter[]>([]);
	let error: string | null = $state(null);
	let deleteConfirmId = $state<string | null>(null);
	let deleting = $state(false);

	// Form
	let saving = $state(false);
	let formError = $state("");
	let editId = $state("");
	let formName = $state("");

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			costCenters = await getCostCenters();
		} catch (e: any) {
			error = e?.message ?? "Error al cargar centros de coste";
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formName = "";
		formError = "";
		editId = "";
	}

	function showCreate() {
		resetForm();
		view = "create";
	}

	function showEdit(cc: CostCenter) {
		resetForm();
		editId = cc.id;
		formName = cc.name;
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

		saving = true;
		try {
			if (view === "create") {
				await createCostCenter({ name: formName.trim() });
			} else {
				await updateCostCenter(editId, { name: formName.trim() });
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
			await deleteCostCenter(id);
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
				{costCenters.length}
				{costCenters.length === 1 ? "centro de coste" : "centros de coste"}
			</p>
			<Button size="sm" onclick={showCreate}>
				<Plus class="size-4" />
				Nuevo centro de coste
			</Button>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<div class="rounded-lg border border-border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nombre</Table.Head>
						<Table.Head class="w-24 text-right">Acciones</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each costCenters as cc (cc.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{cc.name}</Table.Cell>
							<Table.Cell class="text-right">
								{#if deleteConfirmId === cc.id}
									<div class="flex items-center justify-end gap-1">
										<Button
											variant="destructive"
											size="sm"
											onclick={() => handleDelete(cc.id)}
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
									</div>
								{:else}
									<div class="flex items-center justify-end gap-1">
										<button
											class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
											onclick={() => showEdit(cc)}
											title="Editar"
										>
											<Pencil class="size-4" />
										</button>
										<button
											class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
											onclick={() => handleDelete(cc.id)}
											title="Eliminar"
										>
											<Trash2 class="size-4" />
										</button>
									</div>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
					{#if costCenters.length === 0}
						<Table.Row>
							<Table.Cell colspan={2} class="py-8 text-center text-muted-foreground">
								No hay centros de coste.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{:else}
	<div class="mt-4 max-w-lg space-y-4">
		<button
			class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			onclick={backToList}
		>
			<ArrowLeft class="size-4" />
			Volver
		</button>

		<form
			class="rounded-lg border border-border bg-card p-6"
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<h3 class="mb-4 text-sm font-semibold">
				{view === "create" ? "Nuevo centro de coste" : "Editar centro de coste"}
			</h3>
			<div class="space-y-4">
				<div class="space-y-1.5">
					<label for="cc-name" class="text-sm text-muted-foreground">Nombre</label>
					<Input id="cc-name" bind:value={formName} required />
				</div>

				{#if formError}
					<p class="text-sm text-destructive">{formError}</p>
				{/if}

				<Button type="submit" disabled={saving}>
					{saving ? "Guardando..." : "Guardar"}
				</Button>
			</div>
		</form>
	</div>
{/if}
