<script lang="ts">
  import { onMount } from "svelte";
  import {
    categories,
    isLoading,
    error,
    loadProducts,
  } from "../stores/productStore";
  import { isCustomAmountOpen } from "../stores/cartStore";
  import { isClosureModalOpen, isShiftInvoicesModalOpen } from "../stores/registerStore";
  import ProductCard from "./ProductCard.svelte";
  import type { Product } from "../types/shop";
  import type { ShopCategory } from "../stores/productStore";
  import { ShoppingBag, Lock, FileText, LogOut, Plus } from "lucide-svelte";

  let selectedCategory = $state("Todos");
  let storeCategories = $state<ShopCategory[]>([]);
  let loading = $state(true);
  let storeError = $state<string | null>(null);
  let menuOpen = $state(false);

  onMount(() => {
    const unsubCats = categories.subscribe((v) => (storeCategories = v));
    const unsubLoading = isLoading.subscribe((v) => (loading = v));
    const unsubError = error.subscribe((v) => (storeError = v));

    return () => {
      unsubCats();
      unsubLoading();
      unsubError();
    };
  });

  let categoryNames = $derived(["Todos", ...storeCategories.map((c) => c.name)]);

  let filteredProducts = $derived.by(() => {
    const all: Product[] = storeCategories.flatMap((c) => c.products);
    if (selectedCategory === "Todos") return all;
    return all.filter((p) => p.category === selectedCategory);
  });

  function selectCategory(cat: string) {
    selectedCategory = cat;
  }

  function openCustomAmount() {
    isCustomAmountOpen.set(true);
  }

  function openClosureModal() {
    menuOpen = false;
    isClosureModalOpen.set(true);
  }

  function openShiftInvoicesModal() {
    menuOpen = false;
    isShiftInvoicesModalOpen.set(true);
  }
</script>

<main class="h-full flex flex-col relative overflow-hidden bg-zinc-50">
  <!-- HEADER -->
  <div
    class="flex-none flex items-start gap-4 px-4 py-3 bg-zinc-50 z-10 shadow-sm border-b border-zinc-200 min-h-[64px]"
  >
    <!-- LOGO / MENU -->
    <div class="flex-none relative mt-0.5">
      <button
        class="flex items-center justify-center bg-zinc-900 text-white w-9 h-9 rounded-lg shadow-md cursor-pointer hover:bg-zinc-800 transition-colors"
        onclick={() => (menuOpen = !menuOpen)}
      >
        <ShoppingBag class="w-5 h-5" />
      </button>

      {#if menuOpen}
        <!-- Backdrop -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="fixed inset-0 z-20"
          onclick={() => (menuOpen = false)}
          onkeydown={() => {}}
        ></div>

        <!-- Dropdown -->
        <div
          class="absolute left-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-zinc-200 py-1 z-30"
        >
          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
            onclick={openClosureModal}
          >
            <Lock class="w-5 h-5 text-zinc-400" />
            <span class="font-medium">Cerrar caja</span>
          </button>
          <button
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
            onclick={openShiftInvoicesModal}
          >
            <FileText class="w-5 h-5 text-zinc-400" />
            <span class="font-medium">Facturas</span>
          </button>
          <div class="border-t border-zinc-100 my-1"></div>
          <a
            href="/logout"
            class="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
          >
            <LogOut class="w-5 h-5 text-zinc-400" />
            <span class="font-medium">Cerrar sesión</span>
          </a>
        </div>
      {/if}
    </div>

    <!-- KATEGORIEN -->
    <nav class="flex-1 flex flex-wrap gap-2">
      {#each categoryNames as cat}
        <button
          class="px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 active:scale-95 whitespace-nowrap border {selectedCategory ===
          cat
            ? 'bg-zinc-900 text-white border-zinc-900 shadow-md'
            : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'}"
          onclick={() => selectCategory(cat)}
        >
          {cat}
        </button>
      {/each}
    </nav>
  </div>

  <!-- PRODUKT-BEREICH -->
  <div class="flex-1 overflow-y-auto px-4 py-4 scroll-smooth">
    {#if loading}
      <div class="flex items-center justify-center h-full text-zinc-400">
        <div class="text-center">
          <div
            class="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-3"
          ></div>
          <p class="text-sm">Cargando productos...</p>
        </div>
      </div>
    {:else if storeError}
      <div class="flex items-center justify-center h-full text-red-500">
        <div class="text-center">
          <p class="text-sm font-medium mb-2">Error al cargar</p>
          <p class="text-xs text-zinc-400">{storeError}</p>
          <button
            class="mt-3 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800"
            onclick={() => loadProducts()}
          >
            Reintentar
          </button>
        </div>
      </div>
    {:else}
      <div
        class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 pb-20"
      >
        <!-- BUTTON: FREIER BETRAG -->
        <button
          class="group flex flex-col h-full bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 overflow-hidden active:scale-95 active:bg-zinc-100 active:border-zinc-400 text-left hover:border-zinc-400 hover:bg-zinc-100 transition-all min-h-[140px]"
          onclick={openCustomAmount}
        >
          <div
            class="flex-1 flex flex-col items-center justify-center p-4 text-zinc-400 group-hover:text-zinc-600"
          >
            <div
              class="w-12 h-12 rounded-full bg-zinc-200 group-hover:bg-zinc-300 flex items-center justify-center mb-2 transition-colors"
            >
              <Plus class="w-6 h-6" />
            </div>
            <span class="font-bold text-xs uppercase tracking-wide text-center"
              >Importe<br />libre</span
            >
          </div>
        </button>

        <!-- PRODUKTE -->
        {#each filteredProducts as product (product.id)}
          <ProductCard {product} />
        {/each}
      </div>
    {/if}
  </div>
</main>
