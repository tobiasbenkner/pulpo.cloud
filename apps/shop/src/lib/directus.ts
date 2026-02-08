import { createDirectus, rest, authentication } from "@directus/sdk";
import type { AuthenticationData } from "@directus/sdk";
import { DIRECTUS_URL } from "@pulpo/cms";

const STORAGE_KEY = "directus:auth";

const storage = {
  get() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthenticationData;
  },
  set(data: AuthenticationData | null) {
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
};

export const directus = createDirectus(DIRECTUS_URL)
  .with(authentication("json", { storage, autoRefresh: true }))
  .with(rest());
