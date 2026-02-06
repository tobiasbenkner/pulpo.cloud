import { DirectusClient, readMe, RestClient } from "@directus/sdk";
import { Schema, User } from "../types";

export async function getProfile(
  client: DirectusClient<Schema> & RestClient<Schema>,
) {
  const user = (await client.request(
    readMe({
      fields: ["*", "avatar.*"],
    }),
  )) as User;
  return user;
}
