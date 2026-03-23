<script lang="ts">
  import { onMount } from 'svelte';
  import { pb } from '../lib/pb';
  import Login from './Login.svelte';
  import AppGrid from './AppGrid.svelte';

  let authenticated = $state(false);
  let ready = $state(false);

  onMount(async () => {
    if (pb.authStore.isValid) {
      try {
        await pb.collection('users').authRefresh();
        authenticated = true;
      } catch {
        pb.authStore.clear();
      }
    }
    ready = true;

    pb.authStore.onChange(() => {
      authenticated = pb.authStore.isValid;
    });
  });
</script>

{#if ready}
  <div class="flex items-center justify-center min-h-dvh py-12">
    {#if authenticated}
      <AppGrid />
    {:else}
      <Login />
    {/if}
  </div>
{/if}
