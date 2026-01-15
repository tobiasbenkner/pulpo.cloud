import { createDirectus, rest, realtime, authentication } from "@directus/sdk";

export const directus = createDirectus(import.meta.env.PUBLIC_DIRECTUS_URL)
  .with(
    authentication("cookie", {
      autoRefresh: true,
      credentials: "include",
    })
  )
  .with(
    rest({
      credentials: "include",
    })
  )
  .with(
    realtime({
      authMode: "handshake",
    })
  );
