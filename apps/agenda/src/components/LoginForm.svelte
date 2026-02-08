<script lang="ts">
  import { onMount } from "svelte";
  import { directus, isTokenExpired } from "../lib/directus";
  import { authStore } from "../stores/userStore";
  import { AlertCircle, ArrowRight, Loader2 } from "lucide-svelte";

  let email = "";
  let password = "";
  let isLoading = false;
  let error: string | null = null;
  let checking = true;

  onMount(async () => {
    if (!isTokenExpired()) {
      window.location.href = "/";
      return;
    }

    try {
      await directus.refresh();
      window.location.href = "/";
      return;
    } catch {}

    checking = false;
  });

  async function handleLogin() {
    isLoading = true;
    error = null;

    try {
      const response = await directus.login({ email, password });
      authStore.setKey("isAuthenticated", true);
      window.location.href = "/";
    } catch (e: any) {
      console.error(e);

      if (e?.errors?.[0]?.extensions?.code === "INVALID_CREDENTIALS") {
        error =
          "Credenciales incorrectas. Por favor, verifique su email y contraseña.";
      } else {
        error = "Ocurrió un error inesperado. Intente nuevamente.";
      }
      isLoading = false;
    }
  }
</script>

{#if checking}
  <div class="flex items-center justify-center py-12">
    <Loader2 class="animate-spin text-fg-muted" size={32} />
  </div>
{:else}
<div
  class="w-full max-w-md bg-surface p-8 md:p-12 shadow-sm border border-border-light rounded-lg"
>
  <div class="text-center mb-10">
    <h1 class="text-3xl font-serif text-fg mb-2">Bienvenido</h1>
    <p class="text-fg-muted font-light">Ingrese a su cuenta Pulpo</p>
  </div>

  <form on:submit|preventDefault={handleLogin} class="space-y-6">
    {#if error}
      <div
        class="bg-error-bg text-error-text px-4 py-3 rounded-sm text-sm flex items-start gap-3 border border-error-border animate-fade-in"
      >
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <p>{error}</p>
      </div>
    {/if}

    <div class="space-y-2">
      <label
        for="email"
        class="block text-sm font-medium text-fg-secondary uppercase tracking-wide text-xs"
      >
        Email Corporativo
      </label>
      <input
        id="email"
        type="email"
        bind:value={email}
        required
        autocomplete="email"
        placeholder="nombre@pulpo.cloud"
        class="w-full px-4 py-3 bg-input-bg border border-border-default rounded-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:bg-surface"
      />
    </div>

    <div class="space-y-2">
      <label
        for="password"
        class="block text-sm font-medium text-fg-secondary uppercase tracking-wide text-xs"
      >
        Contraseña
      </label>
      <input
        id="password"
        type="password"
        bind:value={password}
        required
        autocomplete="current-password"
        placeholder="••••••••"
        class="w-full px-4 py-3 bg-input-bg border border-border-default rounded-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:bg-surface"
      />
    </div>

    <button
      type="submit"
      disabled={isLoading}
      class="w-full bg-btn-primary-bg text-btn-primary-text py-3.5 px-4 rounded-sm hover:bg-btn-primary-hover transition-all flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-[var(--shadow-color)]"
    >
      {#if isLoading}
        <Loader2 class="animate-spin" size={20} />
        <span>Iniciando sesión...</span>
      {:else}
        <span>Ingresar</span>
        <ArrowRight size={18} />
      {/if}
    </button>
  </form>

  <div class="mt-8 text-center border-t border-border-light pt-6">
    <p class="text-sm text-fg-muted">
      ¿Olvidó su contraseña?
      <a
        href="#"
        class="text-secondary hover:underline decoration-secondary underline-offset-4"
      >
        Contactar Soporte
      </a>
    </p>
  </div>
</div>
{/if}
