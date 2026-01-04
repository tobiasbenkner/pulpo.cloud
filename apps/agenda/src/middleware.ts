import { defineMiddleware } from "astro:middleware";
import { getDirectusClient } from "./lib/directus";
import { refresh } from "@directus/sdk";

const PUBLIC_ROUTES = ["/login", "/logout", "/favicon.ico"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, redirect } = context;

  if (PUBLIC_ROUTES.some((route) => url.pathname.startsWith(route))) {
    return next();
  }

  const accessToken = cookies.get("directus_access_token")?.value;
  const refreshToken = cookies.get("directus_refresh_token")?.value;

  if (accessToken) {
    context.locals.token = accessToken;

    return next();
  }

  if (!accessToken && refreshToken) {
    try {
      const client = getDirectusClient();
      const newTokens = await client.request(
        refresh({
          refresh_token: refreshToken,
          mode: "json",
        })
      );

      if (newTokens.access_token && newTokens.refresh_token) {
        cookies.set("directus_access_token", newTokens.access_token, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: newTokens.expires! / 1000,
        });

        cookies.set("directus_refresh_token", newTokens.refresh_token, {
          path: "/",
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30, // 30 Tage verlängern
        });

        context.locals.token = newTokens.access_token;

        return next();
      }
    } catch (error) {
      console.error("Auto-Refresh failed", error);
    }
  }

  return redirect("/login");
});
