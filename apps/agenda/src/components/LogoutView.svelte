<script lang="ts">
  import { logout } from "../lib/auth";
  import { authStore } from "../stores/userStore";

  async function handleLogout() {
    await logout();
    authStore.set({
      isAuthenticated: false,
      loading: false,
    });
    window.location.href = "/login";
  }
</script>

<button on:click={handleLogout}> Cerrar Sesión </button>
