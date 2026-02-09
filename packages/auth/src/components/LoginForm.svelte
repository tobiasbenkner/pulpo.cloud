<script lang="ts">
  import { onMount } from "svelte";
  import { getAuthClient, getStoredToken, isTokenExpired } from "../client";
  import { authStore } from "../stores/authStore";
  import { AlertCircle, ArrowRight, Loader2 } from "lucide-svelte";

  export let redirectPath = "/";
  export let forgotPasswordPath = "/forgot-password";
  export let supportPath = "/support";

  let email = "";
  let password = "";
  let isLoading = false;
  let error: string | null = null;
  let checking = true;

  onMount(async () => {
    const stored = getStoredToken();
    if (!stored?.refresh_token) {
      checking = false;
      return;
    }

    if (!isTokenExpired()) {
      window.location.href = redirectPath;
      return;
    }

    try {
      await getAuthClient().refresh();
      window.location.href = redirectPath;
      return;
    } catch {}

    checking = false;
  });

  async function handleLogin() {
    isLoading = true;
    error = null;

    try {
      await getAuthClient().login(email, password);
      authStore.setKey("isAuthenticated", true);
      window.location.href = redirectPath;
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
    class="w-full max-w-md bg-surface p-6 md:p-12 shadow-sm border border-border-light rounded-lg"
  >
    <div class="text-center mb-6 md:mb-10">
      <slot name="header">
        <h1 class="text-2xl md:text-3xl font-serif text-fg mb-1">Bienvenido</h1>
        <p class="text-fg-muted font-light text-sm">
          Ingrese a su cuenta Pulpo
        </p>
      </slot>
    </div>

    <form on:submit|preventDefault={handleLogin} class="space-y-4 md:space-y-6">
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
          E-Mail
        </label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
          placeholder=""
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
          placeholder=""
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

    <div
      class="mt-6 md:mt-8 text-center border-t border-border-light pt-4 md:pt-6 space-y-2"
    >
      <p class="text-sm text-fg-muted">
        <a
          href={forgotPasswordPath}
          class="text-secondary hover:underline decoration-secondary underline-offset-4"
        >
          ¿Olvidó su contraseña?
        </a>
      </p>
      {#if supportPath}
        <p class="text-sm text-fg-muted">
          <a
            href={supportPath}
            class="text-fg-muted hover:text-fg-secondary hover:underline underline-offset-4 transition-colors"
          >
            Contactar Soporte
          </a>
        </p>
      {/if}
    </div>
  </div>
{/if}
