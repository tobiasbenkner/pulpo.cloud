<script lang="ts">
  import { onMount } from "svelte";
  import { checkAuthentication } from "../auth";
  import { authStore } from "../stores/authStore";
  import { Loader } from "lucide-svelte";

  export let protect = true;
  export let loginPath = "/login";

  onMount(async () => {
    authStore.setKey("loading", true);

    try {
      const { isAuthenticated } = await checkAuthentication();
      authStore.set({
        isAuthenticated,
        loading: false,
      });
    } catch (error) {
      authStore.set({
        isAuthenticated: false,
        loading: false,
      });

      if (protect) {
        window.location.href = loginPath;
      }
    }
  });
</script>

{#if $authStore.loading}
  <div class="fixed inset-0 bg-surface flex items-center justify-center z-50">
    <div class="flex flex-col items-center gap-4">
      <Loader class="animate-spin text-primary" size={48} />
      <span class="text-xs font-medium text-fg-muted tracking-widest uppercase">
        <slot name="loading">Autenticando...</slot>
      </span>
    </div>
  </div>
{:else if !protect || $authStore.isAuthenticated}
  <slot />
{/if}
