<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
</script>

<DashboardShell activePage="reports">
	<div class="space-y-6">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">Auswertungen</h2>
			<p class="text-sm text-muted-foreground">
				Detaillierte Berichte nach Tag, Monat, Quartal und Jahr.
			</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-6">
			<p class="text-sm text-muted-foreground">
				Report-Migration mit Charts folgt in Phase 3.
			</p>
		</div>
	</div>
</DashboardShell>
