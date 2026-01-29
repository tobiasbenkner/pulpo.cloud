import { createDirectus, rest, realtime, staticToken } from "@directus/sdk";
import { Schema } from "./types";
import { URL } from "./config";

export function createClient(url: string = URL, token?: string) {
  const client = createDirectus<Schema>(url)
    .with(staticToken(token ?? ""))
    .with(rest())
    .with(realtime());
  return client;
}

export function createClientPublic(url: string = URL) {
  const client = createDirectus<Schema>(url).with(rest());
  return client;
}
