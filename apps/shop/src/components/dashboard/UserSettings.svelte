<script lang="ts">
	import { onMount } from "svelte";
	import { pb } from "../../lib/pb";
	import { getUsers, createUser, updateUser, deleteUser } from "../../lib/api";
	import type { User } from "../../lib/types";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Button } from "$lib/components/ui/button/index.js";
	import * as Table from "$lib/components/ui/table/index.js";
	import * as Select from "$lib/components/ui/select/index.js";
	import Pencil from "lucide-svelte/icons/pencil";
	import Trash2 from "lucide-svelte/icons/trash-2";
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import Plus from "lucide-svelte/icons/plus";

	type View = "list" | "create" | "edit";

	let isAdmin = $state(false);
	let loading = $state(true);
	let view = $state<View>("list");
	let users = $state<User[]>([]);
	let error: string | null = $state(null);
	let deleteConfirmId = $state<string | null>(null);
	let deleting = $state(false);

	// Form
	let saving = $state(false);
	let formError = $state("");
	let editId = $state("");
	let formName = $state("");
	let formEmail = $state("");
	let formPassword = $state("");
	let formPasswordConfirm = $state("");
	let formRole = $state("user");

	let currentUserId = $derived(pb.authStore.record?.id ?? "");

	onMount(async () => {
		isAdmin = pb.authStore.record?.role === "admin";
		if (!isAdmin) {
			loading = false;
			return;
		}
		await loadUsers();
	});

	async function loadUsers() {
		loading = true;
		error = null;
		try {
			users = await getUsers();
		} catch (e: any) {
			error = e?.message ?? "Error al cargar usuarios";
		} finally {
			loading = false;
		}
	}

	function resetForm() {
		formName = "";
		formEmail = "";
		formPassword = "";
		formPasswordConfirm = "";
		formRole = "user";
		formError = "";
		editId = "";
	}

	function showCreate() {
		resetForm();
		view = "create";
	}

	function showEdit(user: User) {
		resetForm();
		editId = user.id;
		formName = user.name;
		formEmail = user.email;
		formRole = user.role;
		view = "edit";
	}

	function backToList() {
		view = "list";
		deleteConfirmId = null;
		resetForm();
	}

	async function handleSave() {
		formError = "";

		if (!formName.trim() || !formEmail.trim()) {
			formError = "Nombre y email son obligatorios.";
			return;
		}

		if (view === "create") {
			if (!formPassword || formPassword.length < 8) {
				formError = "La contrasena debe tener al menos 8 caracteres.";
				return;
			}
			if (formPassword !== formPasswordConfirm) {
				formError = "Las contrasenas no coinciden.";
				return;
			}
		} else if (formPassword) {
			if (formPassword.length < 8) {
				formError = "La contrasena debe tener al menos 8 caracteres.";
				return;
			}
			if (formPassword !== formPasswordConfirm) {
				formError = "Las contrasenas no coinciden.";
				return;
			}
		}

		saving = true;
		try {
			if (view === "create") {
				await createUser({
					name: formName.trim(),
					email: formEmail.trim(),
					password: formPassword,
					passwordConfirm: formPasswordConfirm,
					role: formRole,
				});
			} else {
				const data: Record<string, any> = {
					name: formName.trim(),
					email: formEmail.trim(),
					role: formRole,
				};
				if (formPassword) {
					data.password = formPassword;
					data.passwordConfirm = formPasswordConfirm;
				}
				await updateUser(editId, data);
			}
			await loadUsers();
			backToList();
		} catch (e: any) {
			formError = e?.message ?? "Error al guardar";
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		if (deleteConfirmId !== id) {
			deleteConfirmId = id;
			return;
		}
		deleting = true;
		try {
			await deleteUser(id);
			await loadUsers();
			deleteConfirmId = null;
		} catch (e: any) {
			error = e?.message ?? "Error al eliminar";
		} finally {
			deleting = false;
		}
	}

	const roleLabels: Record<string, string> = {
		admin: "Admin",
		user: "Usuario",
	};
</script>

{#if !isAdmin}
	<div class="mt-4 rounded-lg border border-border bg-card p-6">
		<p class="text-sm text-muted-foreground">
			Solo los administradores pueden gestionar usuarios.
		</p>
	</div>
{:else if loading}
	<div class="flex items-center justify-center py-12">
		<div
			class="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
		></div>
	</div>
{:else if view === "list"}
	<div class="mt-4 space-y-4">
		<div class="flex items-center justify-between">
			<p class="text-sm text-muted-foreground">
				{users.length}
				{users.length === 1 ? "usuario" : "usuarios"}
			</p>
			<Button size="sm" onclick={showCreate}>
				<Plus class="size-4" />
				Nuevo usuario
			</Button>
		</div>

		{#if error}
			<p class="text-sm text-destructive">{error}</p>
		{/if}

		<div class="rounded-lg border border-border">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Nombre</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Rol</Table.Head>
						<Table.Head class="w-24 text-right">Acciones</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each users as user (user.id)}
						<Table.Row>
							<Table.Cell class="font-medium"
								>{user.name}</Table.Cell
							>
							<Table.Cell>{user.email}</Table.Cell>
							<Table.Cell
								>{roleLabels[user.role] ??
									user.role}</Table.Cell
							>
							<Table.Cell class="text-right">
								{#if deleteConfirmId === user.id}
									<div class="flex items-center justify-end gap-1">
										<Button
											variant="destructive"
											size="sm"
											onclick={() =>
												handleDelete(user.id)}
											disabled={deleting}
										>
											{deleting
												? "..."
												: "Confirmar"}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onclick={() =>
												(deleteConfirmId = null)}
										>
											Cancelar
										</Button>
									</div>
								{:else}
									<div class="flex items-center justify-end gap-1">
										<button
											class="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
											onclick={() => showEdit(user)}
											title="Editar"
										>
											<Pencil class="size-4" />
										</button>
										{#if user.id !== currentUserId}
											<button
												class="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
												onclick={() =>
													handleDelete(user.id)}
												title="Eliminar"
											>
												<Trash2 class="size-4" />
											</button>
										{/if}
									</div>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</div>
{:else}
	<div class="mt-4 max-w-lg space-y-4">
		<button
			class="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
			onclick={backToList}
		>
			<ArrowLeft class="size-4" />
			Volver
		</button>

		<form
			class="rounded-lg border border-border bg-card p-6"
			onsubmit={(e) => { e.preventDefault(); handleSave(); }}
		>
			<h3 class="mb-4 text-sm font-semibold">
				{view === "create" ? "Nuevo usuario" : "Editar usuario"}
			</h3>
			<div class="space-y-4">
				<div class="space-y-1.5">
					<label for="user-name" class="text-sm text-muted-foreground"
						>Nombre</label
					>
					<Input
						id="user-name"
						bind:value={formName}
						required
					/>
				</div>
				<div class="space-y-1.5">
					<label
						for="user-email"
						class="text-sm text-muted-foreground">Email</label
					>
					<Input
						id="user-email"
						type="email"
						bind:value={formEmail}
						autocomplete="username"
						required
					/>
				</div>
				<div class="space-y-1.5">
					<label
						for="user-password"
						class="text-sm text-muted-foreground"
						>Contrasena{view === "edit"
							? " (dejar en blanco para no cambiar)"
							: ""}</label
					>
					<Input
						id="user-password"
						type="password"
						bind:value={formPassword}
						autocomplete="new-password"
					/>
				</div>
				<div class="space-y-1.5">
					<label
						for="user-password-confirm"
						class="text-sm text-muted-foreground"
						>Confirmar contrasena</label
					>
					<Input
						id="user-password-confirm"
						type="password"
						bind:value={formPasswordConfirm}
						autocomplete="new-password"
					/>
				</div>
				<div class="space-y-1.5">
					<label for="user-role" class="text-sm text-muted-foreground"
						>Rol</label
					>
					<Select.Root type="single" bind:value={formRole}>
						<Select.Trigger class="w-full">
							{roleLabels[formRole] ?? formRole}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="admin" label="Admin"
								>Admin</Select.Item
							>
							<Select.Item value="user" label="Usuario"
								>Usuario</Select.Item
							>
						</Select.Content>
					</Select.Root>
				</div>

				{#if formError}
					<p class="text-sm text-destructive">{formError}</p>
				{/if}

				<Button type="submit" disabled={saving}>
					{saving ? "Guardando..." : "Guardar"}
				</Button>
			</div>
		</form>
	</div>
{/if}
