<script lang="ts">
  import Icon from '@iconify/svelte';
  import { pb } from '../lib/pb';

  interface App {
    name: string;
    description: string;
    href: string;
    color: string;
    icon: string;
  }

  const apps: App[] = [
    {
      name: 'Tienda',
      description: 'Punto de venta y facturación',
      href: '/shop',
      color: 'coral',
      icon: 'lucide:shopping-cart',
    },
    {
      name: 'Agenda',
      description: 'Reservas y gestión de turnos',
      href: '/agenda',
      color: 'navy',
      icon: 'lucide:calendar',
    },
    {
      name: 'Administración',
      description: 'Configuración y gestión',
      href: '/admin',
      color: 'navy',
      icon: 'lucide:settings',
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
      <img src="/apps/assets/logo.png" alt="" class="w-8 h-8" />
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
          <Icon icon={app.icon} class="w-5 h-5" />
        </div>
        <div class="min-w-0">
          <div class="font-display font-semibold text-navy-900 text-[0.9375rem]">{app.name}</div>
          <div class="text-[0.8125rem] text-navy-400 mt-0.5">{app.description}</div>
        </div>
        <Icon icon="lucide:chevron-right" class="ml-auto flex-shrink-0 w-4 h-4 text-navy-300" />
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
