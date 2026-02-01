import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot.js";
import { uploadEvent } from "../services/pocketbase.js";

type UploadConversation = Conversation<BotContext, Context>;

const eventTypes = ["Social", "Dance"] as const;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export async function uploadEventConversation(
  conversation: UploadConversation,
  ctx: Context,
) {
  // Step 1: Event type
  const typeKeyboard = new InlineKeyboard();
  for (const type of eventTypes) {
    typeKeyboard.text(type, `type:${type.toLowerCase()}`);
  }
  await ctx.reply("What type of event?", { reply_markup: typeKeyboard });

  const typeUpdate = await conversation.waitForCallbackQuery(
    eventTypes.map((t) => `type:${t.toLowerCase()}`),
    { otherwise: (ctx) => ctx.reply("Please select an event type.") },
  );
  const eventType = typeUpdate.callbackQuery.data.replace("type:", "");
  await typeUpdate.answerCallbackQuery();

  // Step 2: Weekday
  const dayKeyboard = new InlineKeyboard();
  for (const day of weekdays) {
    dayKeyboard.text(day, `day:${day.toLowerCase()}`);
  }
  dayKeyboard.row();
  await ctx.reply("Which day?", { reply_markup: dayKeyboard });

  const dayUpdate = await conversation.waitForCallbackQuery(
    weekdays.map((d) => `day:${d.toLowerCase()}`),
    { otherwise: (ctx) => ctx.reply("Please select a weekday.") },
  );
  const weekday = dayUpdate.callbackQuery.data.replace("day:", "");
  await dayUpdate.answerCallbackQuery();

  // Step 3: Image
  await ctx.reply("Send me the event image.");

  const photoUpdate = await conversation.waitFor("message:photo", {
    otherwise: (ctx) => ctx.reply("Please send a photo."),
  });

  const photos = photoUpdate.message!.photo!;
  const fileId = photos[photos.length - 1].file_id;
  const file = await photoUpdate.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${photoUpdate.api.token}/${file.file_path}`;

  // Step 4: Upload to PocketBase
  await ctx.reply("Uploading...");

  const imageResponse = await conversation.external(() =>
    fetch(fileUrl).then((res) => res.arrayBuffer()),
  );

  const result = await conversation.external(() =>
    uploadEvent(eventType, weekday, imageResponse),
  );

  if (result.success) {
    await ctx.reply(
      `Event uploaded!\n\nType: ${eventType}\nDay: ${weekday}`,
    );
  } else {
    await ctx.reply(`Upload failed: ${result.error}`);
  }
}
