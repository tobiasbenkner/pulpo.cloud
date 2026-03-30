<script lang="ts">
	import { onMount } from "svelte";
	import {
		getCategoriesWithProducts,
		getCategories,
		getTaxClasses,
		getCostCenters,
		createProduct,
		updateProduct,
		deleteProduct,
		getFileUrl,
	} from "../../lib/api";
	import type {
		PbProduct,
		ProductCategory,
		TaxClass,
		CostCenter,
	} from "../../lib/types";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash2 from "lucide-svelte/icons/trash-2";
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import Plus from "lucide-svelte/icons/plus";
	import ImageIcon from "lucide-svelte/icons/image";
	import Upload from "lucide-svelte/icons/upload";
	import Euro from "lucide-svelte/icons/euro";
	import PackageIcon from "lucide-svelte/icons/package";
	import Tag from "lucide-svelte/icons/tag";
	import WarehouseIcon from "lucide-svelte/icons/warehouse";
	import FileText from "lucide-svelte/icons/file-text";
	import ArrowUpDown from "lucide-svelte/icons/arrow-up-down";
	import ArrowUp from "lucide-svelte/icons/arrow-up";
	import ArrowDown from "lucide-svelte/icons/arrow-down";
	import Search from "lucide-svelte/icons/search";
	import X from "lucide-svelte/icons/x";

	type View = "list" | "create" | "edit";
	type SortKey = "name" | "price" | "category" | "stock" | "sort";
	type SortDir = "asc" | "desc";

	let loading = $state(true);
	let view = $state<View>("list");
	let products = $state<PbProduct[]>([]);
	let categories = $state<ProductCategory[]>([]);
	let taxClasses = $state<TaxClass[]>([]);
	let costCenters = $state<CostCenter[]>([]);
	let error: string | null = $state(null);
	let deleteConfirmId = $state<string | null>(null);
	let deleting = $state(false);

	// Filter & Sort
	let searchQuery = $state("");
	let filterCategory = $state("");
	let sortKey = $state<SortKey>("sort");
	let sortDir = $state<SortDir>("asc");

	let filteredProducts = $derived.by(() => {
		let result = products;

		// Text filter
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			result = result.filter((p) => p.name.toLowerCase().includes(q));
		}

		// Category filter
		if (filterCategory) {
			result = result.filter((p) => p.category === filterCategory);
		}

		// Sort
		const dir = sortDir === "asc" ? 1 : -1;
		result = [...result].sort((a, b) => {
			switch (sortKey) {
				case "name":
					return a.name.localeCompare(b.name) * dir;
				case "price":
					return (Number(a.price_gross) - Number(b.price_gross)) * dir;
				case "category":
					return categoryName(a.category).localeCompare(categoryName(b.category)) * dir;
				case "stock": {
					const sa = typeof a.stock === "number" ? a.stock : -1;
					const sb = typeof b.stock === "number" ? b.stock : -1;
					return (sa - sb) * dir;
				}
				case "sort":
				default:
					return ((a.sort ?? 0) - (b.sort ?? 0)) * dir;
			}
		});

		return result;
	});

	function toggleSort(key: SortKey) {
		if (sortKey === key) {
			sortDir = sortDir === "asc" ? "desc" : "asc";
		} else {
			sortKey = key;
			sortDir = "asc";
		}
	}

	// Form
	let saving = $state(false);
	let formError = $state("");
	let editId = $state("");
	let editRecord = $state<PbProduct | null>(null);
	let formName = $state("");
	let formPriceGross = $state("");
	let formCategory = $state("");
	let formTaxClass = $state("");
	let formCostCenter = $state("");
	let formUnit = $state("unit");
	let formStock = $state<number | null>(null);
	let formTrackStock = $state(false);
	let formNote = $state("");
	let formSort = $state(0);
	let formImage: File | null = $state(null);
	let formImagePreview: string | null = $state(null);
	let formRemoveImage = $state(false);
	let fileInputEl: HTMLInputElement | undefined = $state();

	function categoryName(id: string): string {
		return categories.find((c) => c.id === id)?.name ?? "—";
	}

	function taxClassName(id: string): string {
		const tc = taxClasses.find((c) => c.id === id);
		return tc ? `${tc.name} (${tc.code})` : "—";
	}

	function productImageUrl(p: PbProduct): string {
		if (!p.image) return "";
		return getFileUrl(p, p.image);
	}

	onMount(async () => {
		await loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			const [catResult, taxResult, ccResult] = await Promise.all([
				getCategoriesWithProducts(),
				getTaxClasses(),
				getCostCenters(),
			]);
			categories = catResult.map(({ products: _, ...cat }) => cat);
			products = catResult.flatMap((c) => c.products as PbProduct[]);
			taxClasses = taxResult;
			costCenters = ccResult;
		} catch (e: any) {
			error = e?.message ?? "Error al cargar datos";
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formName = "";
		formPriceGross = "";
		formCategory = "";
		formTaxClass = "";
		formCostCenter = "";
		formUnit = "unit";
		formStock = null;
		formTrackStock = false;
		formNote = "";
		formSort = 0;
		formImage = null;
		if (formImagePreview) {
			URL.revokeObjectURL(formImagePreview);
			formImagePreview = null;
		}
		formRemoveImage = false;
		formError = "";
		editId = "";
		editRecord = null;
		if (fileInputEl) fileInputEl.value = "";
	}

	function showCreate() {
		resetForm();
		formSort = products.length + 1;
		view = "create";
	}

	function showEdit(product: PbProduct) {
		resetForm();
		editId = product.id;
		editRecord = product;
		formName = product.name;
		formPriceGross = product.price_gross;
		formCategory = product.category ?? "";
		formTaxClass = product.tax_class ?? "";
		formCostCenter = product.cost_center ?? "";
		formUnit = product.unit ?? "unit";
		formStock = product.stock;
		formTrackStock = typeof product.stock === "number";
		formNote = product.note ?? "";
		formSort = product.sort ?? 0;
		view = "edit";
	}

	function backToList() {
		view = "list";
		deleteConfirmId = null;
		resetForm();
	}

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) {
			formImage = input.files[0];
			formRemoveImage = false;
			if (formImagePreview) URL.revokeObjectURL(formImagePreview);
			formImagePreview = URL.createObjectURL(input.files[0]);
		}
	}

	async function handleSave() {
		formError = "";

		if (!formName.trim()) {
			formError = "El nombre es obligatorio.";
			return;
		}
		const normalizedPrice = formPriceGross.trim().replace(",", ".");
		if (!normalizedPrice || isNaN(Number(normalizedPrice))) {
			formError = "El precio debe ser un numero valido.";
			return;
		}
		formPriceGross = normalizedPrice;

		saving = true;
		try {
			const fd = new FormData();
			fd.append("name", formName.trim());
			fd.append("price_gross", formPriceGross.trim());
			if (formCategory) fd.append("category", formCategory);
			if (formTaxClass) fd.append("tax_class", formTaxClass);
			if (formCostCenter) fd.append("cost_center", formCostCenter);
			fd.append("unit", formUnit);
			fd.append("sort", String(formSort));
			fd.append("note", formNote);

			if (formTrackStock) {
				fd.append("stock", String(formStock ?? 0));
			} else {
				fd.append("stock", "");
			}

			if (formImage) {
				fd.append("image", formImage);
			} else if (formRemoveImage) {
				fd.append("image", "");
			}

			if (view === "create") {
				await createProduct(fd);
			} else {
				await updateProduct(editId, fd);
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
			await deleteProduct(id);
			await loadData();
			deleteConfirmId = null;
		} catch (e: any) {
			error = e?.message ?? "Error al eliminar";
		} finally {
			deleting = false;
		}
	}

	const unitLabels: Record<string, string> = {
		unit: "Unidad",
		weight: "Peso",
	};
</script>

{#if loading}
	<div class="flex items-center justify-center py-12">
		<div
			class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
	</div>
{:else if view === "list"}
	<div class="mt-4 space-y-4">
		<!-- Toolbar -->
		<div class="flex flex-wrap items-center gap-3">
			<div class="relative flex-1">
				<Search
					class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="text"
					placeholder="Buscar producto..."
					bind:value={searchQuery}
					class="h-8 w-full rounded-lg border border-input bg-transparent pl-8 pr-8 text-sm transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
				/>
				{#if searchQuery}
					<button
						class="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						onclick={() => (searchQuery = "")}
					>
						<X class="size-4" />
					</button>
				{/if}
			</div>
			<Select.Root type="single" bind:value={filterCategory}>
				<Select.Trigger class="w-44">
					{filterCategory
						? categoryName(filterCategory)
						: "Todas las categorias"}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="" label="Todas las categorias"
						>Todas las categorias</Select.Item
					>
					{#each categories as cat (cat.id)}
						<Select.Item value={cat.id} label={cat.name}
							>{cat.name}</Select.Item
						>
					{/each}
				</Select.Content>
			</Select.Root>
			<Button size="sm" onclick={showCreate}>
				<Plus class="size-4" />
				Nuevo producto
			</Button>
		</div>

		<p class="text-xs text-muted-foreground">
			{filteredProducts.length} de {products.length}
			{products.length === 1 ? "producto" : "productos"}
		</p>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<!-- Table -->
		<div class="rounded-lg border border-border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-12"></Table.Head>
						<Table.Head>
							<button
								class="flex items-center gap-1 hover:text-foreground"
								onclick={() => toggleSort("name")}
							>
								Nombre
								{#if sortKey === "name"}
									{#if sortDir === "asc"}<ArrowUp
											class="size-3"
										/>{:else}<ArrowDown
											class="size-3"
										/>{/if}
								{:else}
									<ArrowUpDown
										class="size-3 text-muted-foreground/50"
									/>
								{/if}
							</button>
						</Table.Head>
						<Table.Head>
							<button
								class="flex items-center gap-1 hover:text-foreground"
								onclick={() => toggleSort("price")}
							>
								Precio
								{#if sortKey === "price"}
									{#if sortDir === "asc"}<ArrowUp
											class="size-3"
										/>{:else}<ArrowDown
											class="size-3"
										/>{/if}
								{:else}
									<ArrowUpDown
										class="size-3 text-muted-foreground/50"
									/>
								{/if}
							</button>
						</Table.Head>
						<Table.Head>
							<button
								class="flex items-center gap-1 hover:text-foreground"
								onclick={() => toggleSort("category")}
							>
								Categoria
								{#if sortKey === "category"}
									{#if sortDir === "asc"}<ArrowUp
											class="size-3"
										/>{:else}<ArrowDown
											class="size-3"
										/>{/if}
								{:else}
									<ArrowUpDown
										class="size-3 text-muted-foreground/50"
									/>
								{/if}
							</button>
						</Table.Head>
						<Table.Head>
							<button
								class="flex items-center gap-1 hover:text-foreground"
								onclick={() => toggleSort("stock")}
							>
								Stock
								{#if sortKey === "stock"}
									{#if sortDir === "asc"}<ArrowUp
											class="size-3"
										/>{:else}<ArrowDown
											class="size-3"
										/>{/if}
								{:else}
									<ArrowUpDown
										class="size-3 text-muted-foreground/50"
									/>
								{/if}
							</button>
						</Table.Head>
						<Table.Head class="w-24 text-right">Acciones</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredProducts as product (product.id)}
						<Table.Row>
							<Table.Cell>
								{#if product.image}
									<img
										src={productImageUrl(product)}
										alt={product.name}
										class="size-8 rounded object-cover"
									/>
								{:else}
									<div
										class="flex size-8 items-center justify-center rounded bg-muted"
									>
										<ImageIcon
											class="size-4 text-muted-foreground"
										/>
									</div>
								{/if}
							</Table.Cell>
							<Table.Cell class="font-medium"
								>{product.name}</Table.Cell
							>
							<Table.Cell
								>{product.price_gross} &euro;</Table.Cell
							>
							<Table.Cell
								>{categoryName(product.category)}</Table.Cell
							>
							<Table.Cell>
								{#if typeof product.stock === "number"}
									{product.stock}
								{:else}
									<span class="text-muted-foreground"
										>—</span
									>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right">
								{#if deleteConfirmId === product.id}
									<div
										class="flex items-center justify-end gap-1"
									>
										<Button
											variant="destructive"
											size="sm"
											onclick={() =>
												handleDelete(product.id)}
											disabled={deleting}
										>
											{deleting ? "..." : "Confirmar"}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onclick={() =>
												(deleteConfirmId = null)}
										>
											Cancelar
										</Button>
									</div>
								{:else}
									<div
										class="flex items-center justify-end gap-1"
									>
										<button
											class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
											onclick={() => showEdit(product)}
											title="Editar"
										>
											<Pencil class="size-4" />
										</button>
										<button
											class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
											onclick={() =>
												handleDelete(product.id)}
											title="Eliminar"
										>
											<Trash2 class="size-4" />
										</button>
									</div>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
					{#if filteredProducts.length === 0}
						<Table.Row>
							<Table.Cell colspan={6} class="py-8 text-center text-muted-foreground">
								{searchQuery || filterCategory
									? "No se encontraron productos."
									: "No hay productos."}
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{:else}
	<div class="mt-4 max-w-3xl">
		<button
			class="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			onclick={backToList}
		>
			<ArrowLeft class="size-4" />
			Volver a productos
		</button>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="grid gap-6 lg:grid-cols-[1fr_280px]">
				<!-- Left column: form fields -->
				<div class="space-y-6">
					<!-- Section: Basic info -->
					<div class="rounded-lg border border-border bg-card">
						<div
							class="flex items-center gap-2 border-b border-border px-5 py-3"
						>
							<PackageIcon
								class="size-4 text-muted-foreground"
							/>
							<h3 class="text-sm font-semibold">
								Informacion basica
							</h3>
						</div>
						<div class="space-y-4 p-5">
							<div class="space-y-1.5">
								<label
									for="prod-name"
									class="text-sm font-medium"
									>Nombre del producto</label
								>
								<Input
									id="prod-name"
									bind:value={formName}
									placeholder="Ej. Cafe con leche"
									required
								/>
							</div>
							<div class="grid gap-4 sm:grid-cols-2">
								<div class="space-y-1.5">
									<label
										for="prod-price"
										class="text-sm font-medium"
										>Precio bruto</label
									>
									<div class="relative">
										<Euro
											class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
										/>
										<Input
											id="prod-price"
											bind:value={formPriceGross}
											class="pl-8"
											placeholder="0.00"
											inputmode="decimal"
											pattern="[0-9.,]*"
											required
										/>
									</div>
								</div>
								<div class="space-y-1.5">
									<label class="text-sm font-medium"
										>Unidad de venta</label
									>
									<Select.Root
										type="single"
										bind:value={formUnit}
									>
										<Select.Trigger class="w-full">
											{unitLabels[formUnit] ?? formUnit}
										</Select.Trigger>
										<Select.Content>
											<Select.Item
												value="unit"
												label="Unidad">Unidad</Select.Item
											>
											<Select.Item
												value="weight"
												label="Peso">Peso</Select.Item
											>
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</div>
					</div>

					<!-- Section: Classification -->
					<div class="rounded-lg border border-border bg-card">
						<div
							class="flex items-center gap-2 border-b border-border px-5 py-3"
						>
							<Tag class="size-4 text-muted-foreground" />
							<h3 class="text-sm font-semibold">
								Clasificacion
							</h3>
						</div>
						<div class="space-y-4 p-5">
							<div class="grid gap-4 sm:grid-cols-3">
								<div class="space-y-1.5">
									<label class="text-sm font-medium"
										>Categoria</label
									>
									<Select.Root
										type="single"
										bind:value={formCategory}
									>
										<Select.Trigger class="w-full">
											{categoryName(formCategory) !== "—"
												? categoryName(formCategory)
												: "Seleccionar..."}
										</Select.Trigger>
										<Select.Content>
											{#each categories as cat (cat.id)}
												<Select.Item
													value={cat.id}
													label={cat.name}
													>{cat.name}</Select.Item
												>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-1.5">
									<label class="text-sm font-medium"
										>Clase de impuesto</label
									>
									<Select.Root
										type="single"
										bind:value={formTaxClass}
									>
										<Select.Trigger class="w-full">
											{formTaxClass
												? taxClassName(formTaxClass)
												: "Seleccionar..."}
										</Select.Trigger>
										<Select.Content>
											{#each taxClasses as tc (tc.id)}
												<Select.Item
													value={tc.id}
													label="{tc.name} ({tc.code})"
													>{tc.name} ({tc.code})</Select.Item
												>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-1.5">
									<label class="text-sm font-medium"
										>Centro de coste</label
									>
									<Select.Root
										type="single"
										bind:value={formCostCenter}
									>
										<Select.Trigger class="w-full">
											{formCostCenter
												? (costCenters.find(
														(c) =>
															c.id ===
															formCostCenter,
													)?.name ?? "—")
												: "Seleccionar..."}
										</Select.Trigger>
										<Select.Content>
											{#each costCenters as cc (cc.id)}
												<Select.Item
													value={cc.id}
													label={cc.name}
													>{cc.name}</Select.Item
												>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>
						</div>
					</div>

					<!-- Section: Inventory -->
					<div class="rounded-lg border border-border bg-card">
						<div
							class="flex items-center gap-2 border-b border-border px-5 py-3"
						>
							<WarehouseIcon
								class="size-4 text-muted-foreground"
							/>
							<h3 class="text-sm font-semibold">Inventario</h3>
						</div>
						<div class="space-y-3 p-5">
							<div class="flex items-center gap-2.5">
								<input
									id="prod-track-stock"
									type="checkbox"
									bind:checked={formTrackStock}
									class="size-4 rounded border-input accent-primary"
								/>
								<label
									for="prod-track-stock"
									class="text-sm font-medium"
									>Controlar stock</label
								>
							</div>
							{#if formTrackStock}
								<div class="space-y-1.5 pl-7">
									<label
										for="prod-stock"
										class="text-sm text-muted-foreground"
										>Cantidad actual</label
									>
									<Input
										id="prod-stock"
										type="number"
										bind:value={formStock}
										min="0"
										placeholder="0"
										class="w-32"
									/>
								</div>
							{/if}
						</div>
					</div>

					<!-- Section: Details -->
					<div class="rounded-lg border border-border bg-card">
						<div
							class="flex items-center gap-2 border-b border-border px-5 py-3"
						>
							<FileText class="size-4 text-muted-foreground" />
							<h3 class="text-sm font-semibold">Detalles</h3>
						</div>
						<div class="p-5">
							<div class="space-y-1.5">
								<label
									for="prod-note"
									class="text-sm font-medium"
									>Nota interna</label
								>
								<textarea
									id="prod-note"
									bind:value={formNote}
									rows="3"
									placeholder="Notas visibles solo para el personal..."
									class="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
								></textarea>
							</div>
						</div>
					</div>
				</div>

				<!-- Right column: image -->
				<div>
					<div
						class="sticky top-20 rounded-lg border border-border bg-card"
					>
						<div
							class="flex items-center gap-2 border-b border-border px-5 py-3"
						>
							<ImageIcon class="size-4 text-muted-foreground" />
							<h3 class="text-sm font-semibold">Imagen</h3>
						</div>
						<div class="p-5">
							{#if formImagePreview}
								<div class="space-y-3">
									<img
										src={formImagePreview}
										alt="Preview"
										class="aspect-square w-full rounded-lg object-cover"
									/>
									<button
										type="button"
										class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
										onclick={() => {
											formImage = null;
											if (formImagePreview) URL.revokeObjectURL(formImagePreview);
											formImagePreview = null;
											if (fileInputEl) fileInputEl.value = "";
										}}
									>
										<Trash2 class="size-3.5" />
										Quitar imagen
									</button>
								</div>
							{:else if view === "edit" && editRecord?.image && !formRemoveImage}
								<div class="space-y-3">
									<img
										src={productImageUrl(editRecord)}
										alt={editRecord.name}
										class="aspect-square w-full rounded-lg object-cover"
									/>
									<button
										type="button"
										class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
										onclick={() => (formRemoveImage = true)}
									>
										<Trash2 class="size-3.5" />
										Eliminar imagen
									</button>
								</div>
							{:else}
								<!-- Drop zone style upload -->
								<button
									type="button"
									class="group flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/30 transition-colors hover:border-primary/40 hover:bg-muted/50"
									onclick={() => fileInputEl?.click()}
								>
									<div
										class="flex size-12 items-center justify-center rounded-full bg-muted transition-colors group-hover:bg-primary/10"
									>
										<Upload
											class="size-5 text-muted-foreground transition-colors group-hover:text-primary"
										/>
									</div>
									<div class="text-center">
										<p
											class="text-sm font-medium text-muted-foreground group-hover:text-foreground"
										>
											Subir imagen
										</p>
										<p
											class="mt-0.5 text-xs text-muted-foreground"
										>
											JPG, PNG o WebP
										</p>
									</div>
								</button>
							{/if}
							<input
								bind:this={fileInputEl}
								type="file"
								accept="image/*"
								onchange={handleFileChange}
								class="hidden"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			{#if formError}
				<div
					class="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
				>
					<p class="text-sm text-destructive">{formError}</p>
				</div>
			{/if}

			<div
				class="mt-6 flex items-center justify-end gap-3 border-t border-border pt-5"
			>
				<Button variant="outline" type="button" onclick={backToList}>
					Cancelar
				</Button>
				<Button type="submit" disabled={saving}>
					{saving
						? "Guardando..."
						: view === "create"
							? "Crear producto"
							: "Guardar cambios"}
				</Button>
			</div>
		</form>
	</div>
{/if}
