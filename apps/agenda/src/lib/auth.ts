import { directus } from "./directus";

const TOKEN_KEY = "directus_auth";

export async function checkAuthentication(): Promise<{
  isAuthenticated: boolean;
}> {
  // Prüfe ob Token vorhanden ist
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) {
    throw new Error("Not authenticated");
  }

  try {
    // Versuche Token zu refreshen
    await directus.refresh();
    return { isAuthenticated: true };
  } catch (e) {
    // Token ungültig, aufräumen
    localStorage.removeItem(TOKEN_KEY);
    throw new Error("Not authenticated");
  }
}

export async function logout() {
  if (typeof window === "undefined") return;

  try {
    await directus.logout();
  } catch (e) {
    console.warn("Logout failed:", e);
  } finally {
    // Immer localStorage aufräumen
    localStorage.removeItem(TOKEN_KEY);
  }
}
