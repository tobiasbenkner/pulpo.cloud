import { directus } from "./directus";

export async function checkAuthentication(): Promise<{
  isAuthenticated: boolean;
}> {
  try {
    await directus.refresh();
  } catch (e) {
    throw new Error("Not authenticated");
  }

  return { isAuthenticated: true };
}

export async function logout() {
  if (typeof window === "undefined") return;

  try {
    await directus.logout();
  } catch (e) {
    console.warn("Logout failed:", e);
  }
}
