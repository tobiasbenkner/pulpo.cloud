<script lang="ts">
  import { onMount } from "svelte";
  import {
    isCustomerModalOpen,
    customerModalMode,
    setCustomer,
  } from "../stores/cartStore";
  import { getAuthClient } from "@pulpo/auth";
  import {
    getCustomers,
    searchCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  } from "@pulpo/cms";
  import type { Customer } from "../types/shop";
  import {
    X,
    Search,
    ChevronRight,
    ChevronDown,
    Pencil,
    Trash2,
    ArrowLeft,
    Users,
  } from "lucide-svelte";

  type View = "list" | "create" | "edit";

  let isOpen = $state(false);
  let isVisible = $state(false);
  let mode = $state<"select" | "manage">("select");
  let view = $state<View>("list");
  let loading = $state(false);
  let error = $state("");
  let customers = $state<Customer[]>([]);
  let searchQuery = $state("");
  let saving = $state(false);
  let formError = $state("");
  let deleteConfirmId = $state<string | null>(null);
  let deleting = $state(false);

  // Form fields (shared for create & edit)
  let editId = $state<string | null>(null);
  let formName = $state("");
  let formNif = $state("");
  let formPhone = $state("");
  let formStreet = $state("");
  let formZip = $state("");
  let formCity = $state("");
  let formEmail = $state("");
  let formNotes = $state("");

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let searchInputEl: HTMLInputElement | undefined;

  let title = $derived(
    view === "create"
      ? "Nuevo cliente"
      : view === "edit"
        ? "Editar cliente"
        : mode === "manage"
          ? "Clientes"
          : "Seleccionar cliente",
  );

  function openModalAnim() {
    isOpen = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isVisible = true;
        if (view === "list") searchInputEl?.focus();
      });
    });
  }

  function hideModalAnim() {
    isVisible = false;
    setTimeout(() => {
      isOpen = false;
    }, 300);
  }

  function closeModal() {
    isCustomerModalOpen.set(false);
  }

  function handleSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = searchQuery.trim();
      if (query.length > 0) {
        doSearch(query);
      } else {
        loadAllCustomers();
      }
    }, 300);
  }

  async function loadAllCustomers() {
    loading = true;
    error = "";
    try {
      const client = getAuthClient();
      const result = await getCustomers(client as any);
      customers = result as Customer[];
    } catch (e) {
      console.error("Failed to load customers:", e);
      error = "Error al cargar clientes";
    } finally {
      loading = false;
    }
  }

  async function doSearch(query: string) {
    loading = true;
    error = "";
    try {
      const client = getAuthClient();
      const result = await searchCustomers(client as any, query);
      customers = result as Customer[];
    } catch (e) {
      console.error("Failed to search customers:", e);
      error = "Error en la búsqueda";
    } finally {
      loading = false;
    }
  }

  function selectCustomer(cust: Customer) {
    setCustomer(cust);
  }

  function resetForm() {
    editId = null;
    formName = "";
    formNif = "";
    formPhone = "";
    formStreet = "";
    formZip = "";
    formCity = "";
    formEmail = "";
    formNotes = "";
    formError = "";
  }

  function goToCreate() {
    resetForm();
    view = "create";
  }

  function goToEdit(cust: Customer) {
    editId = cust.id;
    formName = cust.name;
    formNif = cust.nif;
    formPhone = cust.phone ?? "";
    formStreet = cust.street ?? "";
    formZip = cust.zip ?? "";
    formCity = cust.city ?? "";
    formEmail = cust.email ?? "";
    formNotes = cust.notes ?? "";
    formError = "";
    view = "edit";
  }

  function goToList() {
    view = "list";
    deleteConfirmId = null;
    requestAnimationFrame(() => searchInputEl?.focus());
  }

  async function handleSave() {
    if (!formName.trim() || !formNif.trim()) {
      formError = "Nombre y NIF son obligatorios";
      return;
    }

    saving = true;
    formError = "";

    const data = {
      name: formName.trim(),
      nif: formNif.trim(),
      street: formStreet.trim() || null,
      zip: formZip.trim() || null,
      city: formCity.trim() || null,
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
      notes: formNotes.trim() || null,
    };

    try {
      const client = getAuthClient();
      if (view === "edit" && editId) {
        await updateCustomer(client as any, editId, data);
        goToList();
        await loadAllCustomers();
      } else {
        const created = await createCustomer(client as any, data);
        if (mode === "select") {
          setCustomer(created as Customer);
        } else {
          goToList();
          await loadAllCustomers();
        }
      }
    } catch (e) {
      console.error("Failed to save customer:", e);
      formError =
        view === "edit"
          ? "Error al guardar los cambios"
          : "Error al crear el cliente";
    } finally {
      saving = false;
    }
  }

  async function handleDelete(id: string) {
    deleting = true;
    try {
      const client = getAuthClient();
      await deleteCustomer(client as any, id);
      deleteConfirmId = null;
      await loadAllCustomers();
    } catch (e) {
      console.error("Failed to delete customer:", e);
    } finally {
      deleting = false;
    }
  }

  onMount(() => {
    const unsubOpen = isCustomerModalOpen.subscribe((open) => {
      if (open) {
        mode = customerModalMode.get();
        searchQuery = "";
        view = "list";
        deleteConfirmId = null;
        resetForm();
        loadAllCustomers();
        openModalAnim();
      } else {
        hideModalAnim();
      }
    });

    return () => {
      unsubOpen();
      clearTimeout(debounceTimer);
    };
  });
</script>

{#if isOpen}
  <div class="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-zinc-900/60 backdrop-blur-md transition-opacity {isVisible
        ? 'opacity-100'
        : 'opacity-0'}"
    ></div>

    <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
      <div class="flex min-h-full items-center justify-center p-4">
        <!-- Panel -->
        <div
          class="relative transform overflow-hidden rounded-3xl bg-white text-left shadow-2xl transition-all w-full max-w-2xl {isVisible
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-95'}"
        >
          <!-- Header -->
          <div
            class="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-zinc-50"
          >
            <div class="flex items-center gap-3">
              {#if view !== "list"}
                <button
                  class="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-200 transition-colors"
                  onclick={goToList}
                >
                  <ArrowLeft class="h-5 w-5" />
                </button>
              {/if}
              <h3 class="text-lg font-bold text-zinc-900">
                {title}
              </h3>
            </div>
            <button
              class="p-2 bg-white rounded-full text-zinc-400 hover:text-zinc-600 shadow-sm"
              onclick={closeModal}
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <div class="p-6">
            <!-- LIST VIEW -->
            {#if view === "list"}
              <!-- Suche -->
              <div class="relative mb-4">
                <input
                  bind:this={searchInputEl}
                  bind:value={searchQuery}
                  oninput={handleSearchInput}
                  type="text"
                  placeholder="Buscar por nombre o NIF..."
                  class="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900 transition-all"
                />
                <Search
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
                />
              </div>

              <!-- Loading -->
              {#if loading}
                <div class="text-center text-zinc-400 py-4">
                  Cargando clientes...
                </div>
              {/if}

              <!-- Error -->
              {#if error}
                <div class="text-center text-red-500 py-4">{error}</div>
              {/if}

              <!-- Kundenliste -->
              {#if !loading}
                <div class="space-y-2 mb-6 max-h-72 overflow-y-auto pr-2">
                  {#if customers.length === 0 && !error}
                    <div class="text-center text-zinc-400 py-4">
                      No se encontraron clientes
                    </div>
                  {:else}
                    {#each customers as cust (cust.id)}
                      <div
                        class="flex items-center gap-2 p-3 bg-white border rounded-lg transition-colors {deleteConfirmId === cust.id
                          ? 'border-red-300 bg-red-50'
                          : 'border-zinc-100 hover:border-zinc-300'}"
                      >
                        <!-- Delete confirmation -->
                        {#if deleteConfirmId === cust.id}
                          <div class="flex-1">
                            <div class="text-sm font-medium text-red-700">
                              Eliminar "{cust.name}"?
                            </div>
                            <div class="text-xs text-red-500 mt-0.5">
                              El cliente se eliminará. Las facturas existentes
                              conservan los datos.
                            </div>
                          </div>
                          <button
                            class="px-3 py-1.5 text-xs font-bold text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors"
                            onclick={() => (deleteConfirmId = null)}
                          >
                            Cancelar
                          </button>
                          <button
                            class="px-3 py-1.5 text-xs font-bold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            disabled={deleting}
                            onclick={() => handleDelete(cust.id)}
                          >
                            {deleting ? "..." : "Eliminar"}
                          </button>
                        {:else}
                          <!-- Customer info (clickable in select mode) -->
                          {#if mode === "select"}
                            <button
                              class="flex-1 text-left cursor-pointer"
                              onclick={() => selectCustomer(cust)}
                            >
                              <div class="font-bold text-zinc-900">
                                {cust.name}
                              </div>
                              <div class="text-xs text-zinc-500">
                                NIF: {cust.nif}{cust.city
                                  ? ` • ${cust.city}`
                                  : ""}
                              </div>
                            </button>
                            <button
                              class="p-2 text-zinc-300 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Editar"
                              onclick={() => goToEdit(cust)}
                            >
                              <Pencil class="w-4 h-4" />
                            </button>
                            <div class="text-zinc-300">
                              <ChevronRight class="w-5 h-5" />
                            </div>
                          {:else}
                            <!-- Manage mode -->
                            <div class="flex-1">
                              <div class="font-bold text-zinc-900">
                                {cust.name}
                              </div>
                              <div class="text-xs text-zinc-500">
                                NIF: {cust.nif}{cust.city
                                  ? ` • ${cust.city}`
                                  : ""}
                                {#if cust.phone}
                                  <span> • {cust.phone}</span>
                                {/if}
                              </div>
                            </div>
                            <button
                              class="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
                              title="Editar"
                              onclick={() => goToEdit(cust)}
                            >
                              <Pencil class="w-4 h-4" />
                            </button>
                            <button
                              class="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                              onclick={() => (deleteConfirmId = cust.id)}
                            >
                              <Trash2 class="w-4 h-4" />
                            </button>
                          {/if}
                        {/if}
                      </div>
                    {/each}
                  {/if}
                </div>
              {/if}

              <!-- Neuer Kunde Button -->
              <button
                class="w-full flex items-center justify-center gap-2 p-4 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                onclick={goToCreate}
              >
                + Crear nuevo cliente
              </button>

              <!-- CREATE / EDIT VIEW -->
            {:else}
              <div class="grid grid-cols-2 gap-3">
                <input
                  bind:value={formName}
                  type="text"
                  placeholder="Nombre *"
                  class="col-span-2 p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <input
                  bind:value={formNif}
                  type="text"
                  placeholder="NIF / CIF *"
                  class="p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <input
                  bind:value={formPhone}
                  type="text"
                  placeholder="Teléfono"
                  class="p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <input
                  bind:value={formStreet}
                  type="text"
                  placeholder="Dirección"
                  class="col-span-2 p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <input
                  bind:value={formZip}
                  type="text"
                  placeholder="Código postal"
                  class="p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <input
                  bind:value={formCity}
                  type="text"
                  placeholder="Ciudad"
                  class="p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <input
                  bind:value={formEmail}
                  type="email"
                  placeholder="Email"
                  class="col-span-2 p-3 rounded-lg border border-zinc-200 focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                />
                <textarea
                  bind:value={formNotes}
                  placeholder="Notas"
                  class="col-span-2 p-3 rounded-lg border border-zinc-200 resize-none focus:ring-2 focus:ring-zinc-900 focus:border-zinc-900"
                  rows="2"
                ></textarea>
                {#if formError}
                  <div class="col-span-2 text-red-500 text-sm">
                    {formError}
                  </div>
                {/if}
                <button
                  class="col-span-2 bg-zinc-900 text-white py-3 rounded-lg font-bold mt-2 disabled:opacity-50 hover:bg-zinc-800 transition-colors"
                  disabled={saving}
                  onclick={handleSave}
                >
                  {#if saving}
                    Guardando...
                  {:else if view === "edit"}
                    Guardar cambios
                  {:else if mode === "select"}
                    Crear y seleccionar
                  {:else}
                    Crear cliente
                  {/if}
                </button>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
