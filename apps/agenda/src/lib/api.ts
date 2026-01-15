import { readMe } from "@directus/sdk";
import { directus } from "./directus";
import type { User } from "./types";

export async function getProfile() {
  const user = (await directus.request(
    readMe({
      fields: ["*", "avatar.*"],
    })
  )) as User;
  return user;
}
