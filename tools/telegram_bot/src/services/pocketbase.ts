import PocketBase from "pocketbase";
import { config } from "../config.js";

const pb = new PocketBase(config.pocketbaseUrl);

let authenticated = false;

async function ensureAuth() {
  if (authenticated && pb.authStore.isValid) return;
  await pb.collection("_superusers").authWithPassword(
    config.pocketbaseEmail,
    config.pocketbasePassword,
  );
  authenticated = true;
}

export async function uploadEvent(
  type: string,
  weekday: string,
  imageBuffer: ArrayBuffer,
): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureAuth();

    const form = new FormData();
    form.append("type", type);
    form.append("weekday", weekday);
    form.append("image", new Blob([imageBuffer]), "event.jpg");

    await pb.collection("events").create(form);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
