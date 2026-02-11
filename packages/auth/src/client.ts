import {
  createDirectus,
  rest,
  authentication,
  type AuthenticationData,
} from "@directus/sdk";

const TOKEN_KEY = "directus_auth";

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
    console.error("localStorage not available", e);
  }
}

export function isTokenExpired(bufferMs = 30_000) {
  const auth = getStoredToken();
  if (!auth?.expires_at) return true;
  return auth.expires_at < Date.now() + bufferMs;
}

let _client: ReturnType<typeof createClient> | null = null;

function createClient(url: string) {
  return createDirectus(url)
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
}

export function initAuthClient(url: string) {
  if (_client) return _client;
  _client = createClient(url);
  return _client;
}

export function getAuthClient() {
  if (!_client) {
    throw new Error(
      "@pulpo/auth: Client not initialized. Call initAuthClient(url) first.",
    );
  }
  return _client;
}

export { TOKEN_KEY };
