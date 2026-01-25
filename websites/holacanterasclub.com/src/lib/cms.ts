import { DIRECTUS_TOKEN } from "@/config";
import {
  getAssetUrl,
  getEvents as _getEvents,
  type Language,
  type Event,
} from "@pulpo/cms";
import { getCollection } from "astro:content";
import { clientPublic } from "./client";

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL;

export const imageUrl = (id: string, width = 800) =>
  getAssetUrl(id, DIRECTUS_URL, DIRECTUS_TOKEN, { width });

export const getEvents = async (): Promise<Event[]> => {
  const events = await _getEvents(clientPublic);
  return events;
};

export const getLanguages = async (): Promise<Language[]> => {
  const languages = await getCollection("languages");
  return languages.map((it) => it.data);
};
