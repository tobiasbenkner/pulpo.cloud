import { createDirectus, rest, realtime, authentication } from "@directus/sdk";
import { Schema } from "./types";

export function createClient(url: string, token?: string) {
  const client = createDirectus<Schema>(url)
    .with(rest())
    .with(realtime())
    .with(authentication());

  if (token) {
    client.setToken(token);
  }

  return client;
}
