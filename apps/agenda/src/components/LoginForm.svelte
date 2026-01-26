<script lang="ts">
  import { directus } from "../lib/directus";
  import { authStore } from "../stores/userStore";
  import { AlertCircle, ArrowRight, Loader2 } from "lucide-svelte";

  let email = "";
  let password = "";
  let isLoading = false;
  let error: string | null = null;

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

<div
  class="w-full max-w-md bg-white p-8 md:p-12 shadow-sm border border-gray-100 rounded-lg"
>
  <div class="text-center mb-10">
    <h1 class="text-3xl font-serif text-primary mb-2">Bienvenido</h1>
    <p class="text-gray-500 font-light">Ingrese a su cuenta Pulpo</p>
  </div>

  <form on:submit|preventDefault={handleLogin} class="space-y-6">
    {#if error}
      <div
        class="bg-red-50 text-error px-4 py-3 rounded-sm text-sm flex items-start gap-3 border border-red-100 animate-fade-in"
      >
        <AlertCircle size={18} class="mt-0.5 shrink-0" />
        <p>{error}</p>
      </div>
    {/if}

    <div class="space-y-2">
      <label
        for="email"
        class="block text-sm font-medium text-gray-700 uppercase tracking-wide text-xs"
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
        class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:bg-white"
      />
    </div>

    <div class="space-y-2">
      <label
        for="password"
        class="block text-sm font-medium text-gray-700 uppercase tracking-wide text-xs"
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
        class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-sm text-primary placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:bg-white"
      />
    </div>

    <button
      type="submit"
      disabled={isLoading}
      class="w-full bg-primary text-white py-3.5 px-4 rounded-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-gray-200"
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

  <div class="mt-8 text-center border-t border-gray-100 pt-6">
    <p class="text-sm text-gray-400">
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
