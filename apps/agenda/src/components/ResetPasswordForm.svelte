<script lang="ts">
  import { directus } from "../lib/directus";
  import { passwordReset } from "@directus/sdk";
  import { AlertCircle, ArrowLeft, Loader2, KeyRound, CheckCircle } from "lucide-svelte";

  let password = "";
  let confirmPassword = "";
  let isLoading = false;
  let error: string | null = null;
  let success = false;

  const token = new URLSearchParams(window.location.search).get("token");

  async function handleSubmit() {
    if (password !== confirmPassword) {
      error = "Las contraseñas no coinciden.";
      return;
    }

    if (password.length < 8) {
      error = "La contraseña debe tener al menos 8 caracteres.";
      return;
    }

    isLoading = true;
    error = null;

    try {
      await directus.request(passwordReset(token!, password));
      success = true;
    } catch (e: any) {
      console.error(e);
      if (e?.errors?.[0]?.extensions?.code === "INVALID_TOKEN") {
        error = "El enlace ha expirado o no es válido. Solicite uno nuevo.";
      } else {
        error = "No se pudo restablecer la contraseña. Intente nuevamente.";
      }
    } finally {
      isLoading = false;
    }
  }
</script>

{#if !token}
  <div class="w-full max-w-md bg-surface p-6 md:p-12 shadow-sm border border-border-light rounded-lg text-center">
    <AlertCircle size={40} class="text-error-text mx-auto mb-4" />
    <h1 class="text-2xl font-serif text-fg mb-2">Enlace inválido</h1>
    <p class="text-fg-muted text-sm mb-6">Este enlace no contiene un token válido.</p>
    <a
      href="/forgot-password"
      class="inline-flex items-center gap-2 text-sm text-secondary hover:underline decoration-secondary underline-offset-4"
    >
      Solicitar un nuevo enlace
    </a>
  </div>
{:else if success}
  <div class="w-full max-w-md bg-surface p-6 md:p-12 shadow-sm border border-border-light rounded-lg">
    <div class="text-center">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-arrived-bg border border-arrived-border flex items-center justify-center">
        <CheckCircle size={24} class="text-arrived-text" />
      </div>
      <h1 class="text-2xl md:text-3xl font-serif text-fg mb-2">Contraseña actualizada</h1>
      <p class="text-fg-muted font-light text-sm mb-6">
        Su contraseña ha sido restablecida correctamente.
      </p>
      <a
        href="/login"
        class="inline-flex items-center justify-center gap-2 w-full bg-btn-primary-bg text-btn-primary-text py-3.5 px-4 rounded-sm hover:bg-btn-primary-hover transition-all font-medium tracking-wide shadow-md shadow-[var(--shadow-color)]"
      >
        Iniciar sesión
      </a>
    </div>
  </div>
{:else}
  <div class="w-full max-w-md bg-surface p-6 md:p-12 shadow-sm border border-border-light rounded-lg">
    <div class="text-center mb-6 md:mb-10">
      <h1 class="text-2xl md:text-3xl font-serif text-fg mb-1">Nueva contraseña</h1>
      <p class="text-fg-muted font-light text-sm">Ingrese su nueva contraseña</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4 md:space-y-6">
      {#if error}
        <div class="bg-error-bg text-error-text px-4 py-3 rounded-sm text-sm flex items-start gap-3 border border-error-border animate-fade-in">
          <AlertCircle size={18} class="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      {/if}

      <div class="space-y-2">
        <label for="password" class="block font-medium text-fg-secondary uppercase tracking-wide text-xs">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          minlength="8"
          autocomplete="new-password"
          placeholder="••••••••"
          class="w-full px-4 py-3 bg-input-bg border border-border-default rounded-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all hover:bg-surface"
        />
      </div>

      <div class="space-y-2">
        <label for="confirm-password" class="block font-medium text-fg-secondary uppercase tracking-wide text-xs">
          Confirmar contraseña
        </label>
        <input
          id="confirm-password"
          type="password"
          bind:value={confirmPassword}
          required
          minlength="8"
          autocomplete="new-password"
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
          <span>Guardando...</span>
        {:else}
          <KeyRound size={18} />
          <span>Restablecer contraseña</span>
        {/if}
      </button>
    </form>

    <div class="mt-6 md:mt-8 text-center border-t border-border-light pt-4 md:pt-6">
      <a
        href="/login"
        class="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg-secondary transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al inicio de sesión
      </a>
    </div>
  </div>
{/if}
