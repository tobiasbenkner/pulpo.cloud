<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
	import CompanySettings from "../CompanySettings.svelte";
	import UserSettings from "../UserSettings.svelte";
	import PrinterSettings from "../PrinterSettings.svelte";
	import CashRegisterSettings from "../CashRegisterSettings.svelte";
	import Building2 from "lucide-svelte/icons/building-2";
	import UsersIcon from "lucide-svelte/icons/users";
	import PrinterIcon from "lucide-svelte/icons/printer";
	import CreditCard from "lucide-svelte/icons/credit-card";

	type Tab = "empresa" | "usuarios" | "impresoras" | "caja";
	let activeTab = $state<Tab>("empresa");

	const tabs: { id: Tab; label: string; icon: any }[] = [
		{ id: "empresa", label: "Empresa", icon: Building2 },
		{ id: "usuarios", label: "Usuarios", icon: UsersIcon },
		{ id: "impresoras", label: "Impresoras", icon: PrinterIcon },
		{ id: "caja", label: "Caja", icon: CreditCard },
	];
</script>

<DashboardShell activePage="settings">
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

	{#if activeTab === "empresa"}
		<CompanySettings />
	{:else if activeTab === "usuarios"}
		<UserSettings />
	{:else if activeTab === "impresoras"}
		<PrinterSettings />
	{:else}
		<CashRegisterSettings />
	{/if}
</DashboardShell>
