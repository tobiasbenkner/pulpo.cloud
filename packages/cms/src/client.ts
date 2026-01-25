import { createDirectus, rest, realtime, staticToken } from "@directus/sdk";
import { Schema } from "./types";

export function createClient(url: string, token?: string) {
  const client = createDirectus<Schema>(url)
    .with(staticToken(token ?? ""))
    .with(rest())
    .with(realtime());
  return client;
}

export function createClientPublic(url: string) {
  const client = createDirectus<Schema>(url).with(rest());
  return client;
}
