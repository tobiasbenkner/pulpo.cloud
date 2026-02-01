import PocketBase from "pocketbase";
import { config } from "../config.js";

const pb = new PocketBase(config.pocketbaseUrl);

let authenticated = false;

async function ensureAuth() {
  if (authenticated && pb.authStore.isValid) return;
  await pb
    .collection("users")
    .authWithPassword(config.pocketbaseEmail, config.pocketbasePassword);
  authenticated = true;
}

export async function listEvents(): Promise<
  { type: string; weekday: string; imageBuffer: Buffer }[]
> {
  await ensureAuth();
  const records = await pb.collection("dancing_agenda").getFullList();
  const withFlyer = records.filter((record) => record.flyer);
  const events = await Promise.all(
    withFlyer.map(async (record) => {
      const url = pb.files.getURL(record, record.flyer);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const imageBuffer = Buffer.from(await res.arrayBuffer());
      return { type: "flyer", weekday: record.day_of_the_week, imageBuffer };
    }),
  );
  return events;
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
