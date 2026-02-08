import {
  createDirectus,
  rest,
  authentication,
  type AuthenticationData,
} from "@directus/sdk";
import { DIRECTUS_URL, TOKEN_KEY } from "../config";

export function getStoredToken() {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(TOKEN_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storeToken(data: AuthenticationData | null) {
  if (typeof window === "undefined") return;
  try {
    if (data) {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (e) {
    // localStorage not available
    console.error("localStorage not available", e);
  }
}

export function isTokenExpired(bufferMs = 30_000) {
  const auth = getStoredToken();
  if (!auth?.expires_at) return true;
  return auth.expires_at < Date.now() + bufferMs;
}

export const directus = createDirectus(DIRECTUS_URL)
  .with(
    authentication("json", {
      autoRefresh: true,
      storage: {
        get: () => getStoredToken(),
        set: (data) => storeToken(data),
      },
    }),
  )
  .with(rest());
