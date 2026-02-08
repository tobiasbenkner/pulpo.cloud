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

  // Erster Versuch
  try {
    await directus.refresh();
    return { isAuthenticated: true };
  } catch (e) {
    // Könnte ein Netzwerkfehler sein (Mobile Browser brauchen nach
    // App-Wechsel Zeit zum Reconnect) — einmal mit Delay retrying
    console.warn("Token refresh fehlgeschlagen, retry in 1.5s...", e);
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await directus.refresh();
    return { isAuthenticated: true };
  } catch (e) {
    // Zweiter Versuch auch fehlgeschlagen — Token ist wirklich ungültig
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
