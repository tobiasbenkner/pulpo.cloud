<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
</script>

<DashboardShell activePage="invoices">
	<div class="space-y-6">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">Rechnungen</h2>
			<p class="text-sm text-muted-foreground">
				Alle Rechnungen, Tickets und Korrekturen auf einen Blick.
			</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-6">
			<p class="text-sm text-muted-foreground">
				Rechnungsliste mit Filter und Suche folgt in Phase 2.
			</p>
		</div>
	</div>
</DashboardShell>
