<script lang="ts">
	import type { Snippet } from "svelte";
	import { onMount } from "svelte";
	import { checkAuthentication } from "@pulpo/auth";
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import DashboardSidebar from "./DashboardSidebar.svelte";

	const pageTitles: Record<string, string> = {
		overview: "Resumen",
		invoices: "Facturas",
		reports: "Informes",
		products: "Productos",
	};

	let {
		activePage = "overview",
		children,
	}: {
		activePage?: string;
		children?: Snippet;
	} = $props();

	let authenticated = $state(false);

	let title = $derived(pageTitles[activePage] ?? "Dashboard");

	onMount(async () => {
		const ok = await checkAuthentication();
		if (!ok) {
			window.location.href = "/login";
			return;
		}
		authenticated = true;
	});
</script>

{#if authenticated}
	<Sidebar.Provider>
		<DashboardSidebar {activePage} />
		<Sidebar.Inset>
			<header
				class="sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border bg-background px-4"
			>
				<Sidebar.Trigger class="-ml-1" />
				<div class="h-4 w-px bg-border"></div>
				<h1 class="text-sm font-semibold">{title}</h1>
			</header>
			<div class="flex-1 overflow-auto p-6">
				{@render children?.()}
			</div>
		</Sidebar.Inset>
	</Sidebar.Provider>
{:else}
	<div class="flex h-dvh items-center justify-center">
		<div
			class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
	</div>
{/if}
