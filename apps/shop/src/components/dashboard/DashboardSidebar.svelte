<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import { url } from "../../lib/url";
	import LayoutDashboard from "lucide-svelte/icons/layout-dashboard";
	import Receipt from "lucide-svelte/icons/receipt";
	import BarChart3 from "lucide-svelte/icons/bar-chart-3";
	import Package from "lucide-svelte/icons/package";
	import Settings from "lucide-svelte/icons/settings";
	import ShoppingCart from "lucide-svelte/icons/shopping-cart";

	let { activePage = "overview" }: { activePage?: string } = $props();

	const navItems = [
		{
			title: "Resumen",
			url: url("/dashboard"),
			icon: LayoutDashboard,
			id: "overview",
		},
		{
			title: "Facturas",
			url: url("/dashboard/invoices"),
			icon: Receipt,
			id: "invoices",
		},
		{
			title: "Informes",
			url: url("/dashboard/reports"),
			icon: BarChart3,
			id: "reports",
		},
		{
			title: "Productos",
			url: url("/dashboard/products"),
			icon: Package,
			id: "products",
		},
		{
			title: "Ajustes",
			url: url("/dashboard/settings"),
			icon: Settings,
			id: "settings",
		},
	];
</script>

<Sidebar.Root>
	<Sidebar.Header>
		<div class="flex items-center gap-2 px-2 py-1.5">
			<div
				class="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"
			>
				<span class="text-sm font-bold">P</span>
			</div>
			<div class="flex flex-col">
				<span class="text-sm font-semibold">Pulpo</span>
				<span class="text-xs text-muted-foreground">Dashboard</span>
			</div>
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group>
			<Sidebar.GroupLabel>Navegación</Sidebar.GroupLabel>
			<Sidebar.GroupContent>
				<Sidebar.Menu>
					{#each navItems as item (item.id)}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton
								isActive={activePage === item.id}
								tooltipContent={item.title}
							>
								{#snippet child({ props })}
									<a href={item.url} {...props}>
										<item.icon />
										<span>{item.title}</span>
									</a>
								{/snippet}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.GroupContent>
		</Sidebar.Group>
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton>
					{#snippet child({ props })}
						<a href={url("/")} {...props}>
							<ShoppingCart />
							<span>Ir a caja</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>

	<Sidebar.Rail />
</Sidebar.Root>
