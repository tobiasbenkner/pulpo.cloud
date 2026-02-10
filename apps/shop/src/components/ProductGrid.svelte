<script lang="ts">
  import { onMount } from "svelte";
  import { authStore } from "@pulpo/auth";
  import {
    categories,
    isLoading,
    error,
    loadProducts,
  } from "../stores/productStore";
  import { isCustomAmountOpen } from "../stores/cartStore";
  import ProductCard from "./ProductCard.svelte";
  import type { Product } from "../types/shop";
  import type { ShopCategory } from "../stores/productStore";

  let selectedCategory = $state("Alle");
  let storeCategories = $state<ShopCategory[]>([]);
  let loading = $state(true);
  let storeError = $state<string | null>(null);

  // Subscribe to nanostores
  onMount(() => {
    const unsubCats = categories.subscribe((v) => (storeCategories = v));
    const unsubLoading = isLoading.subscribe((v) => (loading = v));
    const unsubError = error.subscribe((v) => (storeError = v));

    // Load products once authenticated
    const unsubAuth = authStore.subscribe((state) => {
      if (!state.loading && state.isAuthenticated) {
        loadProducts();
      }
    });

    return () => {
      unsubCats();
      unsubLoading();
      unsubError();
      unsubAuth();
    };
  });

  let categoryNames = $derived(["Alle", ...storeCategories.map((c) => c.name)]);

  let filteredProducts = $derived.by(() => {
    const all: Product[] = storeCategories.flatMap((c) => c.products);
    if (selectedCategory === "Alle") return all;
    return all.filter((p) => p.category === selectedCategory);
  });

  function selectCategory(cat: string) {
    selectedCategory = cat;
  }

  function openCustomAmount() {
    isCustomAmountOpen.set(true);
  }
</script>

<main class="h-full flex flex-col relative overflow-hidden bg-zinc-50">
  <!-- HEADER -->
  <div
    class="flex-none flex items-start gap-4 px-4 py-3 bg-zinc-50 z-10 shadow-sm border-b border-zinc-200 min-h-[64px]"
  >
    <!-- LOGO -->
    <div
      class="flex-none flex items-center justify-center bg-zinc-900 text-white w-9 h-9 rounded-lg shadow-md cursor-pointer hover:bg-zinc-800 transition-colors mt-0.5"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
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
          <p class="text-sm">Produkte werden geladen...</p>
        </div>
      </div>
    {:else if storeError}
      <div class="flex items-center justify-center h-full text-red-500">
        <div class="text-center">
          <p class="text-sm font-medium mb-2">Fehler beim Laden</p>
          <p class="text-xs text-zinc-400">{storeError}</p>
          <button
            class="mt-3 px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-bold hover:bg-zinc-800"
            onclick={() => loadProducts()}
          >
            Erneut versuchen
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
              <svg
                class="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <span class="font-bold text-xs uppercase tracking-wide text-center"
              >Freier<br />Betrag</span
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
