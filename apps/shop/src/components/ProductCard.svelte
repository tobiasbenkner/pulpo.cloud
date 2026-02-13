<script lang="ts">
  import type { Product } from "../types/shop";
  import { addToCart } from "../stores/cartStore";
  import { TriangleAlert } from "lucide-svelte";

  interface Props {
    product: Product;
  }

  let { product }: Props = $props();

  let hasImage = $derived(!!product.image && product.image.trim() !== "");
  let tracksStock = $derived(typeof product.stock === "number");
  let isOutOfStock = $derived(tracksStock && product.stock === 0);
  let isLowStock = $derived(
    tracksStock && product.stock! > 0 && product.stock! <= 5,
  );

  let dotColor = $derived(
    isOutOfStock
      ? "bg-zinc-300"
      : isLowStock
        ? "bg-orange-500 animate-pulse"
        : "bg-emerald-500",
  );

  let stockLabel = $derived(
    !tracksStock
      ? ""
      : isOutOfStock
        ? "Agotado"
        : isLowStock
          ? `${product.stock} disponible${product.stock === 1 ? "" : "s"}`
          : `${product.stock} uds.`,
  );

  let imgError = $state(false);

  function handleClick() {
    addToCart(product);
  }
</script>

<button
  class="product-card group relative flex flex-col w-full bg-white rounded-2xl border transition-all duration-300 overflow-hidden text-left shadow-[0_2px_8px_rgba(0,0,0,0.04)] border-zinc-100 hover:border-blue-400/50 hover:shadow-xl hover:-translate-y-1"
  data-category={product.category}
  onclick={handleClick}
>
  <!-- 1. BILD BEREICH -->
  <div
    class="relative w-full aspect-[3/2] overflow-hidden bg-zinc-50 border-b border-zinc-50"
  >
    {#if hasImage && !imgError}
      <img
        src={product.image}
        alt={product.name}
        class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        loading="lazy"
        onerror={() => (imgError = true)}
      />
    {:else}
      <div
        class="w-full h-full flex items-center justify-center text-zinc-300 bg-zinc-50"
      >
        <svg
          class="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      </div>
    {/if}

    <!-- Preis Badge -->
    <div
      class="absolute bottom-2 right-2 bg-zinc-900/90 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-sm"
    >
      {Number(product.priceGross).toFixed(2)} &euro;
    </div>
  </div>

  <!-- 2. INHALT -->
  <div class="p-3 flex flex-col flex-1">
    <h3
      class="font-semibold text-zinc-800 text-sm leading-tight line-clamp-2 min-h-[2.5em] mb-2"
      title={product.name}
    >
      {product.name}
    </h3>

    <div class="mt-auto flex items-center justify-between">
      {#if tracksStock}
        <div class="flex items-center gap-2">
          <span class="block w-2 h-2 rounded-full {dotColor} ring-2 ring-white"
          ></span>
          <span
            class="text-[10px] font-medium uppercase tracking-wide {isOutOfStock
              ? 'text-zinc-400'
              : 'text-zinc-500'}"
          >
            {stockLabel}
          </span>
        </div>
      {:else}
        <span class="text-[10px] text-zinc-400 font-medium">Disponible</span>
      {/if}

      {#if isOutOfStock}
        <TriangleAlert class="w-4 h-4 text-orange-400" />
      {:else}
        <svg
          class="w-4 h-4 text-zinc-300 group-hover:text-blue-500 transition-colors transform group-hover:translate-x-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 5l7 7-7 7"
          />
        </svg>
      {/if}
    </div>
  </div>
</button>
