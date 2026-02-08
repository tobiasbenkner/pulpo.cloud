<script lang="ts">
  import { logout } from "../lib/auth";
  import { authStore } from "../stores/userStore";
  import { LogOut, ArrowLeft, Loader2 } from "lucide-svelte";

  let isLoading = false;

  async function handleLogout() {
    isLoading = true;
    await logout();
    authStore.set({
      isAuthenticated: false,
      loading: false,
    });
    window.location.href = "/login";
  }

  function handleCancel() {
    window.history.back();
  }
</script>

<div
  class="w-full max-w-md bg-surface p-8 md:p-12 shadow-sm border border-border-light rounded-lg"
>
  <div class="text-center mb-8">
    <div
      class="w-14 h-14 mx-auto mb-4 rounded-full bg-error-bg border border-error-border flex items-center justify-center"
    >
      <LogOut size={24} class="text-error-text" />
    </div>
    <h1 class="text-2xl font-serif text-fg mb-2">Cerrar sesión</h1>
    <p class="text-fg-muted font-light text-sm leading-relaxed">
      Se cerrará su sesión en este dispositivo.<br />
      Podrá volver a iniciar sesión en cualquier momento.
    </p>
  </div>

  <div class="space-y-3">
    <button
      on:click={handleLogout}
      disabled={isLoading}
      class="w-full bg-error-bg text-error-text border border-error-border py-3 px-4 rounded-sm hover:bg-error-text hover:text-white transition-all flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {#if isLoading}
        <Loader2 class="animate-spin" size={18} />
        <span>Cerrando sesión...</span>
      {:else}
        <LogOut size={18} />
        <span>Cerrar sesión</span>
      {/if}
    </button>

    <button
      on:click={handleCancel}
      disabled={isLoading}
      class="w-full bg-surface text-fg-secondary border border-border-default py-3 px-4 rounded-sm hover:bg-surface-hover transition-all flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <ArrowLeft size={18} />
      <span>Volver a la agenda</span>
    </button>
  </div>
</div>
