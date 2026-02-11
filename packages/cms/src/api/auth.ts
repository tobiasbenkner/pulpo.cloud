import { DirectusClient, readMe, readUsers, RestClient } from "@directus/sdk";
import { Schema, User } from "../types";

export async function getProfile(
  client: DirectusClient<Schema> & RestClient<Schema>,
): Promise<User> {
  const user = (await client.request(
    readMe({
      fields: ["*", "avatar.*"],
    }),
  )) as User;
  return user;
}

export async function listUsers(
  client: DirectusClient<Schema> & RestClient<Schema>,
): Promise<User[]> {
  return (await client.request(
    readUsers({
      fields: ["id", "first_name", "avatar"],
    }),
  )) as User[];
}
