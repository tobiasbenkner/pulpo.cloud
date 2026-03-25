<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
</script>

<DashboardShell activePage="overview">
	<div class="space-y-6">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">Übersicht</h2>
			<p class="text-sm text-muted-foreground">
				Willkommen im Dashboard. Hier siehst du eine Zusammenfassung deiner wichtigsten Kennzahlen.
			</p>
		</div>

		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each [
				{ label: "Tagesumsatz", value: "—", desc: "Brutto heute" },
				{ label: "Transaktionen", value: "—", desc: "Heute" },
				{ label: "Ø Bon", value: "—", desc: "Durchschnitt" },
				{ label: "Bar / Karte", value: "—", desc: "Verhältnis" },
			] as card}
				<div class="rounded-lg border border-border bg-card p-6">
					<p class="text-sm font-medium text-muted-foreground">{card.label}</p>
					<p class="mt-1 text-2xl font-bold">{card.value}</p>
					<p class="mt-1 text-xs text-muted-foreground">{card.desc}</p>
				</div>
			{/each}
		</div>

		<div class="rounded-lg border border-border bg-card p-6">
			<p class="text-sm text-muted-foreground">
				Charts und weitere Auswertungen folgen in Phase 1.
			</p>
		</div>
	</div>
</DashboardShell>
