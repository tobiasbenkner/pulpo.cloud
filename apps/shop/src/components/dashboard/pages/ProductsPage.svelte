<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
	import ProductList from "../ProductList.svelte";
	import CategoryList from "../CategoryList.svelte";
	import CostCenterSettings from "../CostCenterSettings.svelte";
	import Package from "lucide-svelte/icons/package";
	import LayoutList from "lucide-svelte/icons/layout-list";
	import Layers from "lucide-svelte/icons/layers";

	type Tab = "productos" | "categorias" | "centros";
	let activeTab = $state<Tab>("productos");

	const tabs: { id: Tab; label: string; icon: any }[] = [
		{ id: "productos", label: "Productos", icon: Package },
		{ id: "categorias", label: "Categorias", icon: LayoutList },
		{ id: "centros", label: "Centros de coste", icon: Layers },
	];
</script>

<DashboardShell activePage="products">
	<div class="flex gap-4 border-b border-border">
		{#each tabs as tab (tab.id)}
			<button
				class="flex items-center gap-1.5 border-b-2 px-1 pb-2 text-sm font-medium transition-colors {activeTab ===
				tab.id
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeTab = tab.id)}
			>
				<tab.icon class="size-4" />
				{tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === "productos"}
		<ProductList />
	{:else if activeTab === "categorias"}
		<CategoryList />
	{:else}
		<CostCenterSettings />
	{/if}
</DashboardShell>
