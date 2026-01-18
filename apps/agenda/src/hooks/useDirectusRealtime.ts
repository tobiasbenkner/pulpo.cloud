// lib/hooks/useDirectusRealtime.ts
import { onMount, onDestroy } from "svelte";
import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import { directus } from "../lib/directus";

interface DirectusRealtimeMessage<T = any> {
  type: "subscription" | "items" | "auth" | "ping" | "pong";
  event?: "create" | "update" | "delete";
  data?: T[] | T;
  uid?: string;
  status?: string;
}

interface DirectusRealtimeOptions<T = any> {
  collection: string;
  event?: "create" | "update" | "delete" | undefined;
  query?: {
    fields?: string[];
    filter?: Record<string, any>;
    sort?: string[];
    limit?: number;
  };
  onMessage?: (message: DirectusRealtimeMessage<T>) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  loadInitialData?: boolean;
  uid?: string;
}

interface RealtimeState {
  connected: boolean;
  authenticated: boolean;
  error: string | null;
  reconnecting: boolean;
  reconnectAttempts: number;
}

export function useDirectusRealtime<T = any>(
  options: DirectusRealtimeOptions<T>
) {
  const {
    collection,
    event = undefined,
    query = {},
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 20,
    loadInitialData = false,
    uid,
  } = options;

  const state: Writable<RealtimeState> = writable({
    connected: false,
    authenticated: false,
    error: null,
    reconnecting: false,
    reconnectAttempts: 0,
  });

  let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  let isIntentionallyClosed = false;
  let visibilityHandler: (() => void) | null = null;
  let onlineHandler: (() => void) | null = null;
  let offlineHandler: (() => void) | null = null;
  let currentReconnectDelay = reconnectInterval;
  let subscription: any = null;
  let refreshToken: string | null = null;

  async function connect() {
    if (get(state).connected) {
      return;
    }

    try {
      // Setup Event Handlers vor dem Connect
      setupWebSocketEventHandlers();

      // Verbinde WebSocket
      await directus.connect();

      state.update((s) => ({ ...s, connected: true, error: null }));
      console.log("WebSocket verbunden");

      // Authentifizierung
      await authenticate();

      // Lade initiale Daten wenn gewünscht
      if (loadInitialData) {
        await loadRecentMessages();
      }

      // Starte Subscription
      await subscribeToCollection();

      // Reset reconnect counter
      state.update((s) => ({ ...s, reconnectAttempts: 0 }));
      currentReconnectDelay = reconnectInterval;

      onConnect?.();
    } catch (error) {
      console.error("Verbindungsfehler:", error);
      const err =
        error instanceof Error ? error : new Error("Unbekannter Fehler");
      state.update((s) => ({ ...s, error: err.message, connected: false }));
      onError?.(err);

      if (autoReconnect) {
        scheduleReconnect();
      }
    }
  }

  async function authenticate() {
    try {
      // Versuche zuerst mit Access Token
      const accessToken = await directus.getToken();

      if (accessToken) {
        directus.sendMessage({
          type: "auth",
          access_token: accessToken,
        });
        console.log("Authentifizierung mit Access Token erfolgreich");
      } else if (refreshToken) {
        // Fallback auf Refresh Token
        directus.sendMessage({
          type: "auth",
          refresh_token: refreshToken,
        });
        console.log("Authentifizierung mit Refresh Token erfolgreich");
      } else {
        throw new Error("Keine Authentifizierungs-Tokens verfügbar");
      }

      state.update((s) => ({ ...s, authenticated: true }));
    } catch (error) {
      console.error("Authentifizierungsfehler:", error);
      throw error;
    }
  }

  async function loadRecentMessages() {
    const messageUid = uid ? `${uid}-initial` : "get-recent-messages";

    directus.sendMessage({
      type: "items",
      collection: collection,
      action: "read",
      query: {
        limit: 100,
        sort: ["-date_created"],
        ...query,
      },
      uid: messageUid,
    });
  }

  async function subscribeToCollection() {
    try {
      const subscriptionUid = uid || `subscribe-${collection}`;

      const { subscription: sub } = await directus.subscribe(collection, {
        event: event,
        query: query,
        uid: subscriptionUid,
      });

      subscription = sub;

      // Verarbeite eingehende Events
      (async () => {
        try {
          for await (const message of subscription) {
            console.log("Neue Nachricht empfangen:", message);
            onMessage?.(message as DirectusRealtimeMessage<T>);
          }
        } catch (error) {
          console.error("Subscription Fehler:", error);
          if (get(state).connected && autoReconnect) {
            state.update((s) => ({ ...s, connected: false }));
            scheduleReconnect();
          }
        }
      })();

      console.log(`Erfolgreich subscribed zu ${collection}`);
    } catch (error) {
      console.error("Subscription fehlgeschlagen:", error);
      throw error;
    }
  }

  function setupWebSocketEventHandlers() {
    // WebSocket Close Handler
    directus.onWebSocket("close", () => {
      console.log("WebSocket Verbindung geschlossen");
      state.update((s) => ({
        ...s,
        connected: false,
        authenticated: false,
      }));
      onDisconnect?.();

      if (!isIntentionallyClosed && autoReconnect) {
        scheduleReconnect();
      }
    });

    // WebSocket Error Handler
    directus.onWebSocket("error", (error) => {
      console.error("WebSocket Fehler:", error);
      const err = new Error("WebSocket Verbindungsfehler");
      state.update((s) => ({
        ...s,
        error: err.message,
        connected: false,
      }));
      onError?.(err);
    });

    // WebSocket Message Handler
    directus.onWebSocket("message", async (message) => {
      // Ping/Pong für Keep-Alive
      if (message.type === "ping") {
        directus.sendMessage({ type: "pong" });
        return;
      }

      // Handle initial data load response
      if (loadInitialData && message.uid?.includes("initial")) {
        console.log("Initiale Daten empfangen:", message);
        if (message.data && Array.isArray(message.data)) {
          onMessage?.(message as DirectusRealtimeMessage<T>);
        }
        return;
      }

      // Handle auth expiration
      if (message.type === "auth" && message.status === "expired") {
        console.log("Authentifizierung abgelaufen, re-authentifiziere...");

        try {
          if (refreshToken) {
            await directus.sendMessage({
              type: "auth",
              refresh_token: refreshToken,
            });
            console.log("Re-Authentifizierung erfolgreich");
            state.update((s) => ({ ...s, authenticated: true }));
          } else {
            console.log("Kein Refresh Token verfügbar");
            scheduleReconnect();
          }
        } catch (error) {
          console.error("Re-Authentifizierung fehlgeschlagen:", error);
          scheduleReconnect();
        }
      }
    });
  }

  function disconnect() {
    isIntentionallyClosed = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (subscription) {
      subscription = null;
    }

    try {
      directus.disconnect();
    } catch (error) {
      console.error("Disconnect Fehler:", error);
    }

    state.update((s) => ({
      ...s,
      connected: false,
      authenticated: false,
      reconnecting: false,
      reconnectAttempts: 0,
    }));
  }

  function scheduleReconnect() {
    const currentState = get(state);

    if (currentState.reconnectAttempts >= maxReconnectAttempts) {
      console.log("Maximale Reconnect-Versuche erreicht");
      state.update((s) => ({
        ...s,
        error: "Maximale Reconnect-Versuche erreicht",
        reconnecting: false,
      }));
      return;
    }

    if (reconnectTimeout) return;

    state.update((s) => ({
      ...s,
      reconnecting: true,
      reconnectAttempts: s.reconnectAttempts + 1,
    }));

    console.log(
      `Reconnect-Versuch ${currentState.reconnectAttempts + 1}/${maxReconnectAttempts} in ${currentReconnectDelay}ms`
    );

    reconnectTimeout = setTimeout(async () => {
      reconnectTimeout = null;

      if (!get(state).connected && !isIntentionallyClosed) {
        try {
          await connect();
          currentReconnectDelay = reconnectInterval; // Reset delay on success
        } catch (error) {
          console.error("Reconnect fehlgeschlagen:", error);
          // Exponential backoff (max 30s)
          currentReconnectDelay = Math.min(currentReconnectDelay * 1.5, 30000);
          scheduleReconnect();
        }
      }
    }, currentReconnectDelay);
  }

  function handleVisibilityChange() {
    if (document.visibilityState === "visible") {
      console.log("Tab wieder aktiv");
      if (!get(state).connected && !isIntentionallyClosed) {
        connect();
      }
    }
  }

  function handleOnline() {
    console.log("Internet-Verbindung wiederhergestellt");
    state.update((s) => ({ ...s, error: null }));
    if (!get(state).connected && !isIntentionallyClosed) {
      connect();
    }
  }

  function handleOffline() {
    console.log("Keine Internet-Verbindung");
    state.update((s) => ({
      ...s,
      error: "Keine Internet-Verbindung",
      connected: false,
      authenticated: false,
    }));
  }

  onMount(async () => {
    isIntentionallyClosed = false;

    // Lade Refresh Token falls vorhanden
    refreshToken = localStorage.getItem("directus_refresh_token");

    await connect();

    // Event Listener
    visibilityHandler = handleVisibilityChange;
    document.addEventListener("visibilitychange", visibilityHandler);

    onlineHandler = handleOnline;
    offlineHandler = handleOffline;
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
  });

  onDestroy(() => {
    disconnect();

    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
    }
    if (onlineHandler) {
      window.removeEventListener("online", onlineHandler);
    }
    if (offlineHandler) {
      window.removeEventListener("offline", offlineHandler);
    }
  });

  // Erstelle einen abgeleiteten Store für einfacheren Zugriff
  const api = {
    state,
    connect,
    disconnect,
    send: async (action: "create" | "update" | "delete", data: any) => {
      if (!get(state).connected) {
        throw new Error("WebSocket nicht verbunden");
      }

      console.log("send", action, data, collection);
      directus.sendMessage({
        type: "items",
        collection: collection,
        action: action,
        data: data,
        uid: uid ? `${uid}-${action}` : undefined,
      });
    },
  };

  return api;
}
