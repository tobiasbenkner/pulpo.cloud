<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { initAuthClient, checkAuthentication } from "@pulpo/auth";
  import { DIRECTUS_URL } from "@pulpo/cms";
  import { loadProducts, startAutoRefresh } from "../stores/productStore";
  import { isRegisterOpen, syncRegisterState } from "../stores/registerStore";
  import ProductGrid from "./ProductGrid.svelte";
  import OpenRegister from "./OpenRegister.svelte";

  initAuthClient(DIRECTUS_URL);

  let state: "loading" | "ready" | "error" = $state("loading");
  let registerOpen = $state(false);
  let stopAutoRefresh: (() => void) | null = null;

  onMount(() => {
    const unsub = isRegisterOpen.subscribe((v) => (registerOpen = v));
    return unsub;
  });

  onMount(async () => {
    try {
      await checkAuthentication();
      state = "ready";
      loadProducts();
      syncRegisterState();
      stopAutoRefresh = startAutoRefresh();
    } catch {
      window.location.href = "/login";
    }
  });

  onDestroy(() => {
    stopAutoRefresh?.();
  });
</script>

{#if state === "loading"}
  <div class="flex items-center justify-center h-full bg-zinc-50">
    <div class="flex flex-col items-center gap-4">
      <div
        class="w-10 h-10 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"
      ></div>
      <span class="text-xs font-medium text-zinc-400 tracking-widest uppercase">
        Cargando...
      </span>
    </div>
  </div>
{:else if state === "ready"}
  {#if registerOpen}
    <ProductGrid />
  {:else}
    <OpenRegister />
  {/if}
{/if}
