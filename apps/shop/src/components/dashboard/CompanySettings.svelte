<script lang="ts">
	import { onMount } from "svelte";
	import { getCompany, updateCompany } from "../../lib/api";
	import type { Company } from "../../lib/types";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Select from "$lib/components/ui/select/index.js";

	let loading = $state(true);
	let saving = $state(false);
	let error: string | null = $state(null);
	let success = $state(false);

	let companyId = $state("");
	let name = $state("");
	let nif = $state("");
	let street = $state("");
	let zip = $state("");
	let city = $state("");
	let email = $state("");
	let timezone = $state("Europe/Madrid");

	const timezones = [
		{ value: "Europe/Madrid", label: "Europa/Madrid (Peninsular)" },
		{ value: "Atlantic/Canary", label: "Atlantico/Canarias" },
		{ value: "Africa/Ceuta", label: "Africa/Ceuta" },
	];

	onMount(async () => {
		try {
			const company = await getCompany();
			companyId = company.id;
			name = company.name ?? "";
			nif = company.nif ?? "";
			street = company.street ?? "";
			zip = company.zip ?? "";
			city = company.city ?? "";
			email = company.email ?? "";
			timezone = company.timezone ?? "Europe/Madrid";
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
				name,
				nif,
				street,
				zip,
				city,
				email: email || null,
				timezone,
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
		<div class="rounded-lg border border-border bg-card p-6">
			<h3 class="mb-4 text-sm font-semibold">Datos de empresa</h3>
			<div class="grid gap-4 sm:grid-cols-2">
				<div class="space-y-1.5">
					<label for="name" class="text-sm text-muted-foreground"
						>Nombre</label
					>
					<Input id="name" bind:value={name} required />
				</div>
				<div class="space-y-1.5">
					<label for="nif" class="text-sm text-muted-foreground"
						>NIF</label
					>
					<Input id="nif" bind:value={nif} required />
				</div>
				<div class="sm:col-span-2 space-y-1.5">
					<label for="street" class="text-sm text-muted-foreground"
						>Direccion</label
					>
					<Input id="street" bind:value={street} required />
				</div>
				<div class="space-y-1.5">
					<label for="zip" class="text-sm text-muted-foreground"
						>Codigo postal</label
					>
					<Input id="zip" bind:value={zip} required />
				</div>
				<div class="space-y-1.5">
					<label for="city" class="text-sm text-muted-foreground"
						>Ciudad</label
					>
					<Input id="city" bind:value={city} required />
				</div>
				<div class="space-y-1.5">
					<label for="email" class="text-sm text-muted-foreground"
						>Email</label
					>
					<Input id="email" type="email" bind:value={email} />
				</div>
				<div class="space-y-1.5">
					<label for="timezone" class="text-sm text-muted-foreground"
						>Zona horaria</label
					>
					<Select.Root type="single" bind:value={timezone}>
						<Select.Trigger class="w-full">
							{timezones.find((t) => t.value === timezone)
								?.label ?? timezone}
						</Select.Trigger>
						<Select.Content>
							{#each timezones as tz (tz.value)}
								<Select.Item value={tz.value} label={tz.label}
									>{tz.label}</Select.Item
								>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
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
