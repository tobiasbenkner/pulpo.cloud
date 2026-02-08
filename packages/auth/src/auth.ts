import { getAuthClient, getStoredToken, isTokenExpired, TOKEN_KEY } from "./client";

export async function checkAuthentication(): Promise<{
  isAuthenticated: boolean;
}> {
  const stored = getStoredToken();
  if (!stored) {
    throw new Error("Not authenticated");
  }

  if (!isTokenExpired()) {
    return { isAuthenticated: true };
  }

  const client = getAuthClient();

  try {
    await client.refresh();
    return { isAuthenticated: true };
  } catch (e) {
    console.warn("Token refresh failed, retrying in 1.5s...", e);
  }

  await new Promise((resolve) => setTimeout(resolve, 1500));

  try {
    await client.refresh();
    return { isAuthenticated: true };
  } catch (e) {
    localStorage.removeItem(TOKEN_KEY);
    throw new Error("Not authenticated");
  }
}

export async function logout() {
  if (typeof window === "undefined") return;

  const client = getAuthClient();

  try {
    await client.logout();
  } catch (e) {
    console.warn("Logout failed:", e);
  } finally {
    localStorage.removeItem(TOKEN_KEY);
  }
}
