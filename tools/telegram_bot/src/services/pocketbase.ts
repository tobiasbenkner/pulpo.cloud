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

export interface EventEntry {
  type: string;
  weekday: number;
  imageBuffer: Buffer;
  recordId: string;
  filename: string;
}

export async function listEvents(dayOfTheWeek: number): Promise<EventEntry[]> {
  await ensureAuth();
  const records = await pb.collection("dancing_agenda").getFullList({
    filter: `day_of_the_week = ${dayOfTheWeek}`,
  });
  const events: EventEntry[] = [];
  for (const record of records) {
    if (record.flyer) {
      const imageBuffer = await downloadFile(record, record.flyer);
      events.push({
        type: "flyer",
        weekday: record.day_of_the_week,
        imageBuffer,
        recordId: record.id,
        filename: record.flyer,
      });
    }
    const otherEvents: string[] = record.other_events ?? [];
    for (const filename of otherEvents) {
      const imageBuffer = await downloadFile(record, filename);
      events.push({
        type: "other",
        weekday: record.day_of_the_week,
        imageBuffer,
        recordId: record.id,
        filename,
      });
    }
  }
  return events;
}

export async function deleteEventImage(
  recordId: string,
  filename: string,
  type: string,
): Promise<void> {
  await ensureAuth();
  if (type === "flyer") {
    await pb.collection("dancing_agenda").update(recordId, { flyer: null });
  } else {
    await pb
      .collection("dancing_agenda")
      .update(recordId, { "other_events-": [filename] });
  }
}

export async function uploadAgendaImage(
  dayOfTheWeek: number,
  type: "flyer" | "other",
  imageBuffer: ArrayBuffer,
): Promise<void> {
  await ensureAuth();
  const records = await pb.collection("dancing_agenda").getFullList({
    filter: `day_of_the_week = ${dayOfTheWeek}`,
  });
  const record = records[0];
  if (!record) {
    throw new Error(`No record found for day ${dayOfTheWeek}`);
  }
  const form = new FormData();
  if (type === "flyer") {
    form.append("flyer", new Blob([imageBuffer]), "flyer.jpg");
  } else {
    form.append("other_events+", new Blob([imageBuffer]), "event.jpg");
  }
  await pb.collection("dancing_agenda").update(record.id, form);
}
