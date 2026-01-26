import {
  createDirectus,
  rest,
  realtime,
  authentication,
  type AuthenticationData,
} from "@directus/sdk";
import { DIRECTUS_URL, TOKEN_KEY } from "../config";

function getStoredToken() {
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

export const directus = createDirectus(DIRECTUS_URL)
  .with(
    authentication("json", {
      autoRefresh: true,
      credentials: "include",
      storage: {
        get: () => getStoredToken(),
        set: (data) => storeToken(data),
      },
    }),
  )
  .with(
    rest({
      credentials: "include",
    }),
  )
  .with(
    realtime({
      authMode: "handshake",
    }),
  );
