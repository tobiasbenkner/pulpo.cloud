<script lang="ts">
	import DashboardShell from "../DashboardShell.svelte";
</script>

<DashboardShell activePage="reports">
	<div class="space-y-6">
		<div>
			<h2 class="text-2xl font-semibold tracking-tight">Informes</h2>
			<p class="text-sm text-muted-foreground">
				Informes detallados por día, mes, trimestre y año.
			</p>
		</div>

		<div class="rounded-lg border border-border bg-card p-6">
			<p class="text-sm text-muted-foreground">
				La migración de informes con gráficos estará disponible próximamente.
			</p>
		</div>
	</div>
</DashboardShell>
