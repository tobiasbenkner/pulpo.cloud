<script lang="ts">
  let { class: className = "w-4 h-4", ...rest }: { class?: string; [key: string]: any } = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={className}
  {...rest}
>
  <!-- Coin -->
  <circle cx="12" cy="13" r="6" />
  <!-- Coin detail line -->
  <path d="M11.5 10h1v5" />
  <!-- Return arrow arc -->
  <path d="M20 6c-2-3-5-4.5-8.5-4.5S4 3.5 3 6" />
  <!-- Arrowhead -->
  <polyline points="3 2 3 6 7 6" />
</svg>
