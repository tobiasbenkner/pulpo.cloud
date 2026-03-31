<script lang="ts">
  import { pb } from '../lib/pb';
  import { config } from '../lib/config';

  let email = $state(config.defaultEmail);
  let password = $state(config.defaultPassword);
  let error = $state('');
  let loading = $state(false);

  async function handleLogin(e: Event) {
    e.preventDefault();
    error = '';
    loading = true;

    try {
      await pb.collection('users').authWithPassword(email, password);
      window.location.href = '/';
    } catch {
      error = 'Email o contraseña incorrectos';
    } finally {
      loading = false;
    }
  }
</script>

<div class="w-full max-w-[380px] mx-auto px-6">
  <!-- Logo & heading -->
  <div class="text-center mb-10 animate-reveal">
    <div class="inline-flex items-center justify-center w-16 h-16 mb-5">
      <img src="/assets/logo.png" alt="" class="w-14 h-14" />
    </div>
    <h1 class="font-display text-3xl font-bold text-navy-900 tracking-tight">Pulpo</h1>
    <p class="text-[0.8125rem] text-navy-400 mt-2 tracking-wide uppercase font-medium">
      Inicia sesión para continuar
    </p>
  </div>

  <!-- Form card -->
  <div class="bg-white/70 backdrop-blur-sm rounded-2xl border border-sand/80 p-7 shadow-[0_1px_3px_rgba(0,0,0,0.04)] animate-reveal-scale" style="animation-delay: 0.1s;">
    <form onsubmit={handleLogin} class="space-y-5">
      {#if error}
        <div class="text-sm text-coral-700 bg-coral-50 border border-coral-100 rounded-xl px-4 py-3 animate-fade">
          {error}
        </div>
      {/if}

      <div>
        <label for="email" class="block text-xs font-medium text-navy-500 mb-1.5 uppercase tracking-wider">
          Email
        </label>
        <input
          id="email"
          type="email"
          bind:value={email}
          required
          autocomplete="email"
          placeholder="tu@email.com"
          class="w-full px-4 py-3 rounded-xl border border-sand bg-cream/50 text-navy-900 text-[0.9375rem] placeholder:text-navy-300"
        />
      </div>

      <div>
        <label for="password" class="block text-xs font-medium text-navy-500 mb-1.5 uppercase tracking-wider">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
          placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
          class="w-full px-4 py-3 rounded-xl border border-sand bg-cream/50 text-navy-900 text-[0.9375rem] placeholder:text-navy-300"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        class="w-full py-3 rounded-xl bg-navy-900 text-white font-display font-semibold text-sm tracking-wide hover:bg-navy-800 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
      >
        {#if loading}
          <span class="inline-flex items-center gap-2">
            <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Entrando...
          </span>
        {:else}
          Entrar
        {/if}
      </button>
    </form>
  </div>

  <!-- Footer -->
  <p class="text-center text-[0.6875rem] text-navy-300 mt-8 animate-fade" style="animation-delay: 0.3s;">
    pulpo.cloud
  </p>
</div>
