import { InputFile } from "grammy";
import type { Context } from "grammy";
import { listEvents } from "../services/pocketbase.js";

export async function handleListEvents(ctx: Context) {
  const events = await listEvents();

  if (events.length === 0) {
    await ctx.reply("No events found.");
    return;
  }

  for (const event of events) {
    await ctx.replyWithPhoto(new InputFile(event.imageBuffer), {
      caption: `Type: ${event.type} | Day: ${event.weekday}`,
    });
  }
}
