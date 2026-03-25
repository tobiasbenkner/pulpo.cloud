<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
	import InvoiceList from "../InvoiceList.svelte";
</script>

<DashboardShell activePage="invoices">
	<div class="space-y-6">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">Facturas</h2>
			<p class="text-sm text-muted-foreground">
				Todas las facturas, tickets y rectificativas de un vistazo.
			</p>
		</div>

		<InvoiceList />
	</div>
</DashboardShell>
