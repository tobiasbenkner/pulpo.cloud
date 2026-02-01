import type { Context } from "grammy";
import { config } from "../config.js";

export async function handleResetWeek(ctx: Context) {
  await ctx.reply("Triggering reset...");

  try {
    const res = await fetch(config.n8nWebhookUrl, { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await ctx.reply("Week reset triggered successfully.");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.reply(`Failed to trigger reset: ${message}`);
  }
}
