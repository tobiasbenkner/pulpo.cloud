<script lang="ts">
  import { onMount } from "svelte";
  import { initAuthClient, checkAuthentication } from "@pulpo/auth";
  import { DIRECTUS_URL } from "@pulpo/cms";
  import { loadProducts } from "../stores/productStore";
  import ProductGrid from "./ProductGrid.svelte";

  initAuthClient(DIRECTUS_URL);

  let state = $state<"loading" | "ready" | "error">("loading");

  onMount(async () => {
    try {
      await checkAuthentication();
      state = "ready";
      loadProducts();
    } catch {
      window.location.href = "/login";
    }
  });
</script>

{#if state === "loading"}
  <div class="flex items-center justify-center h-full bg-zinc-50">
    <div class="flex flex-col items-center gap-4">
      <div
        class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"
      ></div>
      <span
        class="text-xs font-medium text-zinc-400 tracking-widest uppercase"
      >
        Laden...
      </span>
    </div>
  </div>
{:else if state === "ready"}
  <ProductGrid />
{/if}
