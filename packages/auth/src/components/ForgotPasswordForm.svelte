<script lang="ts">
  import { getAuthClient } from "../client";
  import { passwordRequest } from "@directus/sdk";
  import { AlertCircle, ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-svelte";

  export let loginPath = "/login";
  export let resetPasswordPath = "/reset-password";

  let email = "";
  let isLoading = false;
  let error: string | null = null;
  let success = false;

  async function handleSubmit() {
    isLoading = true;
    error = null;

    try {
      const resetUrl = window.location.origin + resetPasswordPath;
      await getAuthClient().request(passwordRequest(email, resetUrl));
      success = true;
    } catch (e: any) {
      console.error(e);
      error = "No se pudo enviar el correo. Intente nuevamente.";
    } finally {
      isLoading = false;
    }
  }
</script>

{#if success}
  <div class="w-full max-w-md bg-surface p-6 md:p-12 shadow-sm border border-border-light rounded-lg">
    <div class="text-center">
      <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-arrived-bg border border-arrived-border flex items-center justify-center">
        <CheckCircle size={24} class="text-arrived-text" />
      </div>
      <h1 class="text-2xl md:text-3xl font-serif text-fg mb-2">Correo enviado</h1>
      <p class="text-fg-muted font-light text-sm leading-relaxed mb-6">
        Si existe una cuenta con <strong class="text-fg">{email}</strong>,
        recibirá un correo con instrucciones para restablecer su contraseña.
      </p>
      <a
        href={loginPath}
        class="inline-flex items-center gap-2 text-sm text-secondary hover:underline decoration-secondary underline-offset-4"
      >
        <ArrowLeft size={16} />
        Volver al inicio de sesión
      </a>
    </div>
  </div>
{:else}
  <div class="w-full max-w-md bg-surface p-6 md:p-12 shadow-sm border border-border-light rounded-lg">
    <div class="text-center mb-6 md:mb-10">
      <h1 class="text-2xl md:text-3xl font-serif text-fg mb-1">Recuperar contraseña</h1>
      <p class="text-fg-muted font-light text-sm">Ingrese su email para recibir un enlace de recuperación</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="space-y-4 md:space-y-6">
      {#if error}
        <div class="bg-error-bg text-error-text px-4 py-3 rounded-sm text-sm flex items-start gap-3 border border-error-border animate-fade-in">
          <AlertCircle size={18} class="mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      {/if}

      <div class="space-y-2">
        <label
          for="email"
          class="block font-medium text-fg-secondary uppercase tracking-wide text-xs"
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

      <button
        type="submit"
        disabled={isLoading}
        class="w-full bg-btn-primary-bg text-btn-primary-text py-3.5 px-4 rounded-sm hover:bg-btn-primary-hover transition-all flex items-center justify-center gap-2 font-medium tracking-wide disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-[var(--shadow-color)]"
      >
        {#if isLoading}
          <Loader2 class="animate-spin" size={20} />
          <span>Enviando...</span>
        {:else}
          <Mail size={18} />
          <span>Enviar enlace</span>
        {/if}
      </button>
    </form>

    <div class="mt-6 md:mt-8 text-center border-t border-border-light pt-4 md:pt-6">
      <a
        href={loginPath}
        class="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg-secondary transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al inicio de sesión
      </a>
    </div>
  </div>
{/if}
