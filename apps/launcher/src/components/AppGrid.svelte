<script lang="ts">
  import { pb } from '../lib/pb';

  interface App {
    name: string;
    description: string;
    href: string;
    color: string;
    iconPath: string;
  }

  const apps: App[] = [
    {
      name: 'Tienda',
      description: 'Punto de venta y facturación',
      href: '/shop',
      color: 'coral',
      iconPath: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.1 1.3.6 1.3H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
    },
    {
      name: 'Agenda',
      description: 'Reservas y gestión de turnos',
      href: '/agenda',
      color: 'navy',
      iconPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      name: 'Ajustes',
      description: 'Configuración del sistema',
      href: '/settings',
      color: 'navy',
      iconPath: 'M10.3 21l-.2-2.5a6.5 6.5 0 01-1.3-.5l-2 1.5-2.4-2.4 1.5-2a6.5 6.5 0 01-.5-1.3L3 13.7v-3.4l2.5-.2c.1-.4.3-.9.5-1.3l-1.5-2 2.4-2.4 2 1.5c.4-.2.9-.4 1.3-.5L10.3 3h3.4l.2 2.5c.4.1.9.3 1.3.5l2-1.5 2.4 2.4-1.5 2c.2.4.4.9.5 1.3l2.4.1v3.4l-2.5.2c-.1.4-.3.9-.5 1.3l1.5 2-2.4 2.4-2-1.5c-.4.2-.9.4-1.3.5L13.7 21h-3.4zM12 15a3 3 0 100-6 3 3 0 000 6z',
    },
  ];

  function handleLogout() {
    pb.authStore.clear();
    window.location.href = '/';
  }

  function getIconBg(color: string) {
    return color === 'coral' ? 'bg-coral-50 text-coral-600' : 'bg-navy-50 text-navy-600';
  }

  function getHoverBorder(color: string) {
    return color === 'coral' ? 'hover:border-coral-300' : 'hover:border-navy-300';
  }
</script>

<div class="w-full max-w-[440px] mx-auto px-6">
  <!-- Header -->
  <div class="flex items-center justify-between mb-10 animate-reveal">
    <div class="flex items-center gap-3">
      <img src="/assets/logo.png" alt="" class="w-8 h-8" />
      <span class="font-display text-xl font-bold text-navy-900 tracking-tight">Pulpo</span>
    </div>
    <button
      onclick={handleLogout}
      class="text-xs text-navy-400 hover:text-coral-500 transition-colors cursor-pointer uppercase tracking-wider font-medium"
    >
      Salir
    </button>
  </div>

  <!-- Section label -->
  <p
    class="text-[0.6875rem] font-medium text-navy-400 uppercase tracking-[0.14em] mb-4 animate-reveal"
    style="animation-delay: 0.05s;"
  >
    Aplicaciones
  </p>

  <!-- App cards -->
  <div class="grid gap-3">
    {#each apps as app, i}
      <a
        href={app.href}
        class="app-card flex items-center gap-5 p-5 bg-white/70 backdrop-blur-sm rounded-2xl border border-sand/80 {getHoverBorder(app.color)} animate-reveal"
        style="animation-delay: {0.08 + i * 0.06}s;"
      >
        <div class="flex-shrink-0 w-11 h-11 rounded-xl {getIconBg(app.color)} flex items-center justify-center">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d={app.iconPath} />
          </svg>
        </div>
        <div class="min-w-0">
          <div class="font-display font-semibold text-navy-900 text-[0.9375rem]">{app.name}</div>
          <div class="text-[0.8125rem] text-navy-400 mt-0.5">{app.description}</div>
        </div>
        <svg class="ml-auto flex-shrink-0 w-4 h-4 text-navy-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </a>
    {/each}
  </div>

  <!-- Footer -->
  <p
    class="text-center text-[0.6875rem] text-navy-300 mt-10 animate-fade"
    style="animation-delay: 0.35s;"
  >
    pulpo.cloud
  </p>
</div>
