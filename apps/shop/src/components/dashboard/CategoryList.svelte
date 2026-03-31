<script lang="ts">
	import { onMount } from "svelte";
	import {
		createCategory,
		updateCategory,
		deleteCategory,
		getCategoriesWithProducts,
		updateProduct,
		getFileUrl,
	} from "../../lib/api";
	import type { ProductCategory, PbProduct } from "../../lib/types";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash2 from "lucide-svelte/icons/trash-2";
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import Plus from "lucide-svelte/icons/plus";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import ChevronDown from "lucide-svelte/icons/chevron-down";
	import ArrowUp from "lucide-svelte/icons/arrow-up";
	import ArrowDown from "lucide-svelte/icons/arrow-down";
	import ImageIcon from "lucide-svelte/icons/image";

	type View = "list" | "create" | "edit";

	interface CategoryWithProducts extends ProductCategory {
		products: PbProduct[];
	}

	let loading = $state(true);
	let view = $state<View>("list");
	let categories = $state<CategoryWithProducts[]>([]);
	let error: string | null = $state(null);
	let deleteConfirmId = $state<string | null>(null);
	let deleting = $state(false);
	let expandedIds = $state<Set<string>>(new Set());
	let reordering = $state(false);

	// Form
	let saving = $state(false);
	let formError = $state("");
	let editId = $state("");
	let formName = $state("");
	let formSort = $state(0);

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const result = await getCategoriesWithProducts();
			categories = result.map((c) => ({
				...c,
				products: ((c.products as PbProduct[]) ?? []).sort(
					(a, b) => (a.sort ?? 0) - (b.sort ?? 0),
				),
			}));
		} catch (e: any) {
			error = e?.message ?? "Error al cargar categorias";
		} finally {
			loading = false;
		}
	}

	function toggleExpand(id: string) {
		const next = new Set(expandedIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expandedIds = next;
	}

	async function moveProduct(
		catIndex: number,
		prodIndex: number,
		direction: -1 | 1,
	) {
		const cat = categories[catIndex];
		const prods = [...cat.products];
		const targetIndex = prodIndex + direction;
		if (targetIndex < 0 || targetIndex >= prods.length) return;

		// Swap in array
		[prods[prodIndex], prods[targetIndex]] = [
			prods[targetIndex],
			prods[prodIndex],
		];

		// Reassign sort values
		const updates: { id: string; sort: number }[] = [];
		for (let i = 0; i < prods.length; i++) {
			if (prods[i].sort !== i + 1) {
				prods[i] = { ...prods[i], sort: i + 1 };
				updates.push({ id: prods[i].id, sort: i + 1 });
			}
		}

		// Optimistic update
		categories = categories.map((c, i) =>
			i === catIndex ? { ...c, products: prods } : c,
		);

		// Persist
		reordering = true;
		try {
			await Promise.all(
				updates.map(({ id, sort }) => {
					const fd = new FormData();
					fd.append("sort", String(sort));
					return updateProduct(id, fd);
				}),
			);
		} catch (e: any) {
			error = e?.message ?? "Error al reordenar";
			await loadData();
		} finally {
			reordering = false;
		}
	}

	function resetForm() {
		formName = "";
		formSort = 0;
		formError = "";
		editId = "";
	}

	function showCreate() {
		resetForm();
		formSort = categories.length + 1;
		view = "create";
	}

	function showEdit(cat: ProductCategory) {
		resetForm();
		editId = cat.id;
		formName = cat.name;
		formSort = cat.sort ?? 0;
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
			const data = { name: formName.trim(), sort: formSort };
			if (view === "create") {
				await createCategory(data);
			} else {
				await updateCategory(editId, data);
			}
			await loadData();
			backToList();
		} catch (e: any) {
			formError = e?.message ?? "Error al guardar";
		} finally {
			saving = false;
		}
	}

	async function moveCategory(index: number, direction: -1 | 1) {
		const targetIndex = index + direction;
		if (targetIndex < 0 || targetIndex >= categories.length) return;

		const cats = [...categories];
		[cats[index], cats[targetIndex]] = [cats[targetIndex], cats[index]];

		const updates: { id: string; sort: number }[] = [];
		for (let i = 0; i < cats.length; i++) {
			if (cats[i].sort !== i + 1) {
				cats[i] = { ...cats[i], sort: i + 1 };
				updates.push({ id: cats[i].id, sort: i + 1 });
			}
		}

		categories = cats;

		reordering = true;
		try {
			await Promise.all(
				updates.map(({ id, sort }) => updateCategory(id, { sort })),
			);
		} catch (e: any) {
			error = e?.message ?? "Error al reordenar";
			await loadData();
		} finally {
			reordering = false;
		}
	}

	async function handleDelete(id: string) {
		if (deleteConfirmId !== id) {
			deleteConfirmId = id;
			return;
		}
		deleting = true;
		try {
			await deleteCategory(id);
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
				{categories.length}
				{categories.length === 1 ? "categoria" : "categorias"}
			</p>
			<Button size="sm" onclick={showCreate}>
				<Plus class="size-4" />
				Nueva categoria
			</Button>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<div class="space-y-2">
			{#each categories as cat, catIndex (cat.id)}
				<div class="rounded-lg border border-border">
					<!-- Category header -->
					<div class="flex items-center justify-between px-4 py-3">
						<button
							class="flex flex-1 items-center gap-2 text-left"
							onclick={() => toggleExpand(cat.id)}
						>
							{#if expandedIds.has(cat.id)}
								<ChevronDown
									class="size-4 text-muted-foreground"
								/>
							{:else}
								<ChevronRight
									class="size-4 text-muted-foreground"
								/>
							{/if}
							<span class="text-sm font-semibold"
								>{cat.name}</span
							>
							<span
								class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
							>
								{cat.products.length}
							</span>
						</button>
						<div class="flex items-center gap-1">
							{#if deleteConfirmId === cat.id}
								<Button
									variant="destructive"
									size="sm"
									onclick={() => handleDelete(cat.id)}
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
									onclick={() => showEdit(cat)}
									title="Editar"
								>
									<Pencil class="size-4" />
								</button>
								<button
									class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
									onclick={() => handleDelete(cat.id)}
									disabled={cat.products.length > 0}
									title={cat.products.length > 0 ? "Eliminar productos primero" : "Eliminar"}
								>
									<Trash2 class="size-4" />
								</button>
								<div class="ml-1 flex items-center gap-0.5 border-l border-border pl-2">
									<button
										class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
										disabled={catIndex === 0 || reordering}
										onclick={() => moveCategory(catIndex, -1)}
										title="Subir"
									>
										<ArrowUp class="size-3.5" />
									</button>
									<button
										class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
										disabled={catIndex === categories.length - 1 || reordering}
										onclick={() => moveCategory(catIndex, 1)}
										title="Bajar"
									>
										<ArrowDown class="size-3.5" />
									</button>
								</div>
							{/if}
						</div>
					</div>

					<!-- Expanded product list -->
					{#if expandedIds.has(cat.id)}
						<div class="border-t border-border">
							{#if cat.products.length === 0}
								<p
									class="px-4 py-6 text-center text-sm text-muted-foreground"
								>
									No hay productos en esta categoria.
								</p>
							{:else}
								{#each cat.products as product, prodIndex (product.id)}
									<div
										class="flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0 {reordering
											? 'opacity-60'
											: ''}"
									>
										<!-- Product info -->
										{#if product.image}
											<img
												src={getFileUrl(product, product.image)}
												alt={product.name}
												class="size-8 rounded object-cover"
											/>
										{:else}
											<div class="flex size-8 items-center justify-center rounded bg-muted">
												<ImageIcon class="size-4 text-muted-foreground" />
											</div>
										{/if}
										<div class="flex-1">
											<span class="text-sm"
												>{product.name}</span
											>
										</div>
										<span
											class="text-sm text-muted-foreground"
											>{product.price_gross}
											&euro;</span
										>
										{#if product.stock != null && product.stock >= 0}
											<span
												class="text-xs text-muted-foreground"
												>{product.stock} uds.</span
											>
										{/if}
										<!-- Sort buttons -->
										<div class="ml-1 flex items-center gap-0.5 border-l border-border pl-2">
											<button
												class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
												disabled={prodIndex === 0 ||
													reordering}
												onclick={() =>
													moveProduct(
														catIndex,
														prodIndex,
														-1,
													)}
												title="Subir"
											>
												<ArrowUp class="size-3.5" />
											</button>
											<button
												class="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
												disabled={prodIndex ===
													cat.products.length - 1 ||
													reordering}
												onclick={() =>
													moveProduct(
														catIndex,
														prodIndex,
														1,
													)}
												title="Bajar"
											>
												<ArrowDown class="size-3.5" />
											</button>
										</div>
									</div>
								{/each}
							{/if}
						</div>
					{/if}
				</div>
			{/each}
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
				{view === "create" ? "Nueva categoria" : "Editar categoria"}
			</h3>
			<div class="space-y-4">
				<div class="space-y-1.5">
					<label
						for="cat-name"
						class="text-sm text-muted-foreground">Nombre</label
					>
					<Input id="cat-name" bind:value={formName} required />
				</div>
				<div class="space-y-1.5">
					<label
						for="cat-sort"
						class="text-sm text-muted-foreground">Orden</label
					>
					<Input
						id="cat-sort"
						type="number"
						bind:value={formSort}
					/>
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
