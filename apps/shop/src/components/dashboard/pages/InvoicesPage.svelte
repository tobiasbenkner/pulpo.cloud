<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
	import InvoiceList from "../InvoiceList.svelte";
</script>

<DashboardShell activePage="invoices">
	<div class="space-y-6">
		<InvoiceList />
	</div>
</DashboardShell>
