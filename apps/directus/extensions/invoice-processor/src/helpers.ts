import type { EndpointContext } from "./types";

export async function getTenantFromUser(
  userId: string,
  context: EndpointContext,
): Promise<string | null> {
  const row = await (context.database as any)("directus_users")
    .select("tenant")
    .where("id", userId)
    .first();

  return row?.tenant ?? null;
}
