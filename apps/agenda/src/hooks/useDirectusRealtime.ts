// lib/hooks/useDirectusRealtime.ts
import { onMount, onDestroy } from "svelte";
import { writable, get } from "svelte/store";
import type { Writable } from "svelte/store";
import { directus } from "../lib/directus";
export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

interface DirectusRealtimeMessage<T = any> {
  type: "subscription" | "items" | "auth" | "ping" | "pong";
  event?: "create" | "update" | "delete" | "init" | "error";
  data?: T[] | T;
  uid?: string;
  status?: "ok" | "error" | "expired";
  error?: { code: string; message: string };
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
  onResume?: () => void;
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
  options: DirectusRealtimeOptions<T>,
) {
  const {
    collection,
    event = undefined,
    query: initialQuery = {},
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    onResume,
    autoReconnect = true,
    reconnectInterval = 2000,
    maxReconnectAttempts = 20,
    loadInitialData = false,
    uid,
  } = options;

  // Mutable query that can be updated
  let currentQuery = { ...initialQuery };

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
  let subscription: AsyncGenerator<any> | null = null;
  let eventHandlersRegistered = false;
  let isReconnecting = false;
  let isDestroyed = false;

  function setupWebSocketEventHandlers() {
    // Nur einmal registrieren
    if (eventHandlersRegistered) return;
    eventHandlersRegistered = true;

    // WebSocket Close Handler
    directus.onWebSocket("close", () => {
      console.log("[Realtime] WebSocket geschlossen");
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
      console.error("[Realtime] WebSocket Fehler:", error);
      const err = new Error("WebSocket Verbindungsfehler");
      state.update((s) => ({
        ...s,
        error: err.message,
      }));
      onError?.(err);
    });

    // WebSocket Message Handler für Auth und initiale Daten
    directus.onWebSocket("message", (message: DirectusRealtimeMessage) => {
      // Ping/Pong für Keep-Alive
      if (message.type === "ping") {
        directus.sendMessage({ type: "pong" });
        return;
      }

      // Auth-Nachrichten verarbeiten (handshake-mode sendet diese automatisch)
      if (message.type === "auth") {
        if (message.status === "ok") {
          console.log("[Realtime] Authentifizierung erfolgreich");
          state.update((s) => ({ ...s, authenticated: true, error: null }));
        } else if (message.status === "expired") {
          console.log("[Realtime] Token abgelaufen, refresh + reconnect...");
          state.update((s) => ({ ...s, authenticated: false }));
          // Token über REST refreshen, dann WebSocket komplett neu verbinden
          directus
            .refresh()
            .then(() => {
              console.log(
                "[Realtime] Token refreshed, reconnecting WebSocket...",
              );
              reconnect();
            })
            .catch((err) => {
              console.error("[Realtime] Token refresh fehlgeschlagen:", err);
              // Refresh-Token auch abgelaufen — sauber trennen
              disconnect();
              onError?.(new SessionExpiredError());
            });
        } else if (message.status === "error") {
          console.error("[Realtime] Auth-Fehler:", message.error);
          state.update((s) => ({
            ...s,
            authenticated: false,
            error: message.error?.message || "Authentifizierungsfehler",
          }));
          onError?.(
            new Error(message.error?.message || "Authentifizierungsfehler"),
          );
        }
        return;
      }

      // Handle initial data load response
      if (loadInitialData && message.uid?.includes("initial")) {
        console.log("[Realtime] Initiale Daten empfangen");
        if (message.data && Array.isArray(message.data)) {
          onMessage?.(message as DirectusRealtimeMessage<T>);
        }
      }
    });
  }

  async function connect() {
    const currentState = get(state);
    if (currentState.connected || isReconnecting) {
      return;
    }

    isReconnecting = true;

    try {
      // Event Handlers nur einmal registrieren
      setupWebSocketEventHandlers();

      // Bei Reconnect: Token über REST refreshen bevor der WS-Handshake startet
      const currentAttempts = get(state).reconnectAttempts;
      if (currentAttempts > 0) {
        try {
          await directus.refresh();
          console.log("[Realtime] Token vor Reconnect refreshed");
        } catch (e) {
          console.warn(
            "[Realtime] Token refresh vor Reconnect fehlgeschlagen:",
            e,
          );
          // Weiter versuchen — vielleicht ist der Token noch gültig
        }
      }

      // Verbinde WebSocket - Auth erfolgt via handshake-mode
      await directus.connect();

      state.update((s) => ({
        ...s,
        connected: true,
        error: null,
        reconnecting: false,
      }));
      console.log("[Realtime] WebSocket verbunden");

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
      // WebSocket ist bereits offen - State synchronisieren statt Fehler werfen
      if (
        error instanceof Error &&
        error.message.includes('Cannot connect when state is "open"')
      ) {
        console.log(
          "[Realtime] WebSocket bereits verbunden, synchronisiere State",
        );
        state.update((s) => ({
          ...s,
          connected: true,
          error: null,
          reconnecting: false,
          reconnectAttempts: 0,
        }));
        currentReconnectDelay = reconnectInterval;
        return;
      }

      console.error("[Realtime] Verbindungsfehler:", error);
      const err =
        error instanceof Error ? error : new Error("Unbekannter Fehler");
      state.update((s) => ({
        ...s,
        error: err.message,
        connected: false,
        authenticated: false,
      }));
      onError?.(err);

      if (autoReconnect && !isIntentionallyClosed) {
        scheduleReconnect();
      }
    } finally {
      isReconnecting = false;
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
        ...currentQuery,
      },
      uid: messageUid,
    });
  }

  async function subscribeToCollection() {
    try {
      const subscriptionUid = uid || `subscribe-${collection}`;

      const { subscription: sub } = await directus.subscribe(collection, {
        event: event,
        query: currentQuery,
        uid: subscriptionUid,
      });

      subscription = sub;

      // Verarbeite eingehende Events in separater async Funktion
      processSubscriptionMessages();

      console.log(`[Realtime] Subscribed zu ${collection}`);
    } catch (error) {
      console.error("[Realtime] Subscription fehlgeschlagen:", error);
      throw error;
    }
  }

  async function processSubscriptionMessages() {
    if (!subscription) return;

    try {
      for await (const message of subscription) {
        // Prüfe ob wir noch verbunden sein sollen
        if (isIntentionallyClosed) break;

        console.log("[Realtime] Nachricht empfangen:", message);
        onMessage?.(message as DirectusRealtimeMessage<T>);
      }
    } catch (error) {
      // Nur reconnecten wenn nicht absichtlich geschlossen
      // und der close-Handler nicht bereits einen Reconnect plant
      if (!isIntentionallyClosed && get(state).connected) {
        console.error("[Realtime] Subscription unterbrochen:", error);
        state.update((s) => ({ ...s, connected: false }));
        // Nicht scheduleReconnect() aufrufen - der close-Handler macht das bereits
      }
    }
  }

  function disconnect() {
    isIntentionallyClosed = true;
    performDisconnect();
  }

  function performDisconnect() {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    subscription = null;

    try {
      directus.disconnect();
    } catch (error) {
      // Ignoriere Fehler beim Disconnect (z.B. wenn bereits geschlossen)
    }

    state.update((s) => ({
      ...s,
      connected: false,
      authenticated: false,
      reconnecting: false,
      reconnectAttempts: 0,
    }));
  }

  async function reconnect() {
    if (isDestroyed) return;
    console.log("[Realtime] Reconnecting...");

    // Flag setzen damit der close-Handler keinen konkurrierenden scheduleReconnect auslöst
    isIntentionallyClosed = true;
    performDisconnect();

    // Kurz warten bis WebSocket wirklich geschlossen ist
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Abbrechen wenn Component zwischenzeitlich destroyed wurde
    if (isDestroyed) return;

    // Flags zurücksetzen für neue Verbindung
    isIntentionallyClosed = false;
    isReconnecting = false;

    // Neu verbinden
    await connect();
  }

  function setQuery(newQuery: DirectusRealtimeOptions<T>["query"]) {
    currentQuery = { ...newQuery };
  }

  function scheduleReconnect() {
    // Verhindere doppelte Reconnect-Aufrufe
    if (reconnectTimeout || isIntentionallyClosed) return;

    const currentState = get(state);

    if (currentState.reconnectAttempts >= maxReconnectAttempts) {
      console.log("[Realtime] Maximale Reconnect-Versuche erreicht");
      state.update((s) => ({
        ...s,
        error: "Maximale Reconnect-Versuche erreicht",
        reconnecting: false,
      }));
      onError?.(new Error("Maximale Reconnect-Versuche erreicht"));
      return;
    }

    const nextAttempt = currentState.reconnectAttempts + 1;
    state.update((s) => ({
      ...s,
      reconnecting: true,
      reconnectAttempts: nextAttempt,
    }));

    console.log(
      `[Realtime] Reconnect ${nextAttempt}/${maxReconnectAttempts} in ${currentReconnectDelay}ms`,
    );

    reconnectTimeout = setTimeout(async () => {
      reconnectTimeout = null;

      if (!get(state).connected && !isIntentionallyClosed) {
        try {
          await connect();
        } catch (error) {
          console.error("[Realtime] Reconnect fehlgeschlagen:", error);
          // Exponential backoff (max 30s)
          currentReconnectDelay = Math.min(currentReconnectDelay * 1.5, 30000);
          scheduleReconnect();
        }
      }
    }, currentReconnectDelay);
  }

  async function handleVisibilityChange() {
    if (document.visibilityState !== "visible" || isIntentionallyClosed) return;

    console.log("[Realtime] Tab wieder aktiv");

    // Token proaktiv refreshen — nach langer Inaktivität ist er wahrscheinlich abgelaufen
    try {
      await directus.refresh();
      console.log("[Realtime] Token nach Tab-Rückkehr refreshed");
    } catch (e) {
      console.warn(
        "[Realtime] Token refresh nach Tab-Rückkehr fehlgeschlagen:",
        e,
      );
      // Nicht sofort als SessionExpired behandeln — könnte ein Netzwerkfehler sein
      // (Mobile Browser brauchen nach App-Wechsel Zeit zum Reconnect).
      // Stattdessen weiter versuchen: der WS-Handshake sendet auth.expired
      // wenn die Session wirklich tot ist, und DER Handler redirectet dann.
      if (!navigator.onLine) {
        return;
      }
    }

    // Abbrechen wenn Component zwischenzeitlich destroyed wurde
    if (isDestroyed) return;

    // WebSocket immer neu aufbauen — selbst wenn `connected` true ist,
    // kann der Browser den WS im Hintergrund still beendet haben
    currentReconnectDelay = reconnectInterval;
    state.update((s) => ({ ...s, reconnectAttempts: 0, error: null }));
    await reconnect();

    // Daten könnten veraltet sein - View informieren
    if (navigator.onLine) {
      onResume?.();
    }
  }

  function handleOnline() {
    console.log("[Realtime] Internet-Verbindung wiederhergestellt");
    state.update((s) => ({ ...s, error: null }));
    const currentState = get(state);

    if (!currentState.connected && !isIntentionallyClosed) {
      // Reset delay bei Netzwerk-Wiederherstellung
      currentReconnectDelay = reconnectInterval;
      connect();
    }

    // Daten könnten veraltet sein - View informieren
    onResume?.();
  }

  function handleOffline() {
    console.log("[Realtime] Keine Internet-Verbindung");
    state.update((s) => ({
      ...s,
      error: "Keine Internet-Verbindung",
    }));
  }

  onMount(async () => {
    isIntentionallyClosed = false;
    eventHandlersRegistered = false;

    await connect();

    // Event Listener für Browser-Events
    visibilityHandler = handleVisibilityChange;
    document.addEventListener("visibilitychange", visibilityHandler);

    onlineHandler = handleOnline;
    offlineHandler = handleOffline;
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
  });

  onDestroy(() => {
    isDestroyed = true;
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

  const api = {
    state,
    connect,
    disconnect,
    reconnect,
    setQuery,
    send: async (action: "create" | "update" | "delete", data: any) => {
      const currentState = get(state);

      if (!currentState.connected) {
        throw new Error("WebSocket nicht verbunden");
      }

      if (!currentState.authenticated) {
        throw new Error("WebSocket nicht authentifiziert");
      }

      const message = {
        type: "items",
        collection: collection,
        action: action,
        data: data,
        uid: uid ? `${uid}-${action}` : undefined,
      };

      console.log("[Realtime] Sende:", message);

      try {
        directus.sendMessage(message);
      } catch (error) {
        console.error("[Realtime] Senden fehlgeschlagen:", error);
        throw error;
      }
    },
  };

  return api;
}
