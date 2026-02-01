import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot.js";
import { uploadAgendaImage } from "../services/pocketbase.js";
import { mainMenu } from "./start.js";

type UploadConversation = Conversation<BotContext, Context>;

const weekdays = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
] as const;

const imageTypes = ["flyer", "other"] as const;

export async function uploadAgendaConversation(
  conversation: UploadConversation,
  ctx: Context,
) {
  const cancelData = "cancel";

  // Step 1: Weekday
  const dayKeyboard = new InlineKeyboard();
  for (const day of weekdays) {
    dayKeyboard.text(day.label, `uday:${day.value}`);
  }
  dayKeyboard.row().text("Cancel", cancelData);
  await ctx.reply("Which day?", { reply_markup: dayKeyboard });

  const dayUpdate = await conversation.waitForCallbackQuery(
    [...weekdays.map((d) => `uday:${d.value}`), cancelData],
    { otherwise: (ctx) => ctx.reply("Please select a weekday.") },
  );
  await dayUpdate.answerCallbackQuery();
  if (dayUpdate.callbackQuery.data === cancelData) {
    await ctx.reply("Cancelled.", { reply_markup: mainMenu });
    return;
  }
  const dayNumber = Number(dayUpdate.callbackQuery.data.replace("uday:", ""));
  const dayLabel = weekdays.find((d) => d.value === dayNumber)!.label;

  // Step 2: Type
  const typeKeyboard = new InlineKeyboard();
  for (const type of imageTypes) {
    typeKeyboard.text(type, `utype:${type}`);
  }
  typeKeyboard.row().text("Cancel", cancelData);
  await ctx.reply("Flyer or other?", { reply_markup: typeKeyboard });

  const typeUpdate = await conversation.waitForCallbackQuery(
    [...imageTypes.map((t) => `utype:${t}`), cancelData],
    { otherwise: (ctx) => ctx.reply("Please select flyer or other.") },
  );
  await typeUpdate.answerCallbackQuery();
  if (typeUpdate.callbackQuery.data === cancelData) {
    await ctx.reply("Cancelled.", { reply_markup: mainMenu });
    return;
  }
  const imageType = typeUpdate.callbackQuery.data.replace("utype:", "") as
    | "flyer"
    | "other";

  // Step 3: Photo
  await ctx.reply("Send me the image. /cancel to abort.");

  let photoUpdate: Context;
  while (true) {
    photoUpdate = await conversation.wait();
    if (photoUpdate.hasCommand("cancel")) {
      await ctx.reply("Cancelled.");
      return;
    }
    if (photoUpdate.has("message:photo")) break;
    await photoUpdate.reply("Please send a photo or /cancel to abort.");
  }

  const photos = photoUpdate.message!.photo!;
  const fileId = photos[photos.length - 1].file_id;
  const file = await photoUpdate.api.getFile(fileId);
  const fileUrl = `https://api.telegram.org/file/bot${photoUpdate.api.token}/${file.file_path}`;

  await ctx.reply("Uploading...");

  try {
    const imageBuffer = await conversation.external(() =>
      fetch(fileUrl).then((res) => res.arrayBuffer()),
    );

    await conversation.external(() =>
      uploadAgendaImage(dayNumber, imageType, imageBuffer),
    );

    await ctx.reply(`Uploaded ${imageType} for ${dayLabel}.`, {
      reply_markup: mainMenu,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.reply(`Upload failed: ${message}`, {
      reply_markup: mainMenu,
    });
  }
}
