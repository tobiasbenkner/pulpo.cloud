<script lang="ts">
  import { onMount } from "svelte";
  import { checkAuthentication } from "../lib/auth";
  import { authStore } from "../stores/userStore";
  import { Loader } from "lucide-svelte";

  export let protect = true;

  onMount(async () => {
    authStore.setKey("loading", true);

    try {
      const { isAuthenticated } = await checkAuthentication();
      authStore.set({
        isAuthenticated,
        loading: false,
      });
    } catch (error) {
      console.log("Kein gültiges Refresh-Token gefunden oder abgelaufen.");

      authStore.set({
        isAuthenticated: false,
        loading: false,
      });

      if (protect) {
        window.location.href = "/login";
      }
    }
  });
</script>

{#if $authStore.loading}
  <div class="fixed inset-0 bg-surface flex items-center justify-center z-50">
    <div class="flex flex-col items-center gap-4">
      <Loader class="animate-spin text-primary" size={48} />
      <span class="text-xs font-medium text-fg-muted tracking-widest uppercase">
        Autenticando...
      </span>
    </div>
  </div>
{:else if !protect || $authStore.isAuthenticated}
  <slot />
{/if}
