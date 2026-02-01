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

async function downloadFile(
  record: { id: string; collectionId: string; collectionName: string },
  filename: string,
): Promise<Buffer> {
  const url = pb.files.getURL(record, filename);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${pb.authStore.token}` },
  });
  return Buffer.from(await res.arrayBuffer());
}

export async function listEvents(
  dayOfTheWeek: number,
): Promise<{ type: string; weekday: number; imageBuffer: Buffer }[]> {
  await ensureAuth();
  const records = await pb.collection("dancing_agenda").getFullList({
    filter: `day_of_the_week = ${dayOfTheWeek}`,
  });
  const events: { type: string; weekday: number; imageBuffer: Buffer }[] = [];
  for (const record of records) {
    if (record.flyer) {
      const imageBuffer = await downloadFile(record, record.flyer);
      events.push({
        type: "flyer",
        weekday: record.day_of_the_week,
        imageBuffer,
      });
    }
    const otherEvents: string[] = record.other_events ?? [];
    for (const filename of otherEvents) {
      const imageBuffer = await downloadFile(record, filename);
      events.push({
        type: "other",
        weekday: record.day_of_the_week,
        imageBuffer,
      });
    }
  }
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
