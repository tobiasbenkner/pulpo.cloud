<script lang="ts">
	import { onMount } from "svelte";
	import { getCompany, updateCompany } from "../../lib/api";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import Mail from "lucide-svelte/icons/mail";

	let loading = $state(true);
	let saving = $state(false);
	let error: string | null = $state(null);
	let success = $state(false);

	let companyId = $state("");
	let closureEmail = $state("");

	onMount(async () => {
		try {
			const company = await getCompany();
			companyId = company.id;
			closureEmail = company.closure_email ?? "";
		} catch (e: any) {
			error = e?.message ?? "Error al cargar los datos";
		} finally {
			loading = false;
		}
	});

	async function handleSave() {
		saving = true;
		error = null;
		success = false;
		try {
			await updateCompany(companyId, {
				closure_email: closureEmail || null,
			});
			success = true;
			setTimeout(() => (success = false), 3000);
		} catch (e: any) {
			error = e?.message ?? "Error al guardar";
		} finally {
			saving = false;
		}
	}
</script>

{#if loading}
	<div class="flex items-center justify-center py-12">
		<div
			class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
	</div>
{:else}
	<div class="mt-4 max-w-2xl space-y-6">
		<div class="rounded-lg border border-border bg-card">
			<div class="flex items-center gap-2 border-b border-border px-5 py-3">
				<Mail class="size-4 text-muted-foreground" />
				<h3 class="text-sm font-semibold">Email de cierre</h3>
			</div>
			<div class="space-y-1.5 p-5">
				<label for="closure-email" class="text-sm font-medium"
					>Direccion de email</label
				>
				<Input
					id="closure-email"
					type="email"
					bind:value={closureEmail}
					placeholder="cierre@ejemplo.com"
				/>
				<p class="text-xs text-muted-foreground">
					Se enviara el informe de cierre de caja a este email.
				</p>
			</div>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}
		{#if success}
			<p class="text-sm text-green-600">Guardado correctamente.</p>
		{/if}

		<Button onclick={handleSave} disabled={saving}>
			{saving ? "Guardando..." : "Guardar cambios"}
		</Button>
	</div>
{/if}
