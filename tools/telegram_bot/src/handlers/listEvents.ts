import { InputFile, InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot.js";
import { listEvents } from "../services/pocketbase.js";

type ListConversation = Conversation<BotContext, Context>;

const weekdays = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 7 },
] as const;

export async function listEventsConversation(
  conversation: ListConversation,
  ctx: Context,
) {
  const cancelData = "cancel";

  const dayKeyboard = new InlineKeyboard();
  for (const day of weekdays) {
    dayKeyboard.text(day.label, `list:${day.value}`);
  }
  dayKeyboard.row().text("Cancel", cancelData);
  await ctx.reply("Which day?", { reply_markup: dayKeyboard });

  const dayUpdate = await conversation.waitForCallbackQuery(
    [...weekdays.map((d) => `list:${d.value}`), cancelData],
    { otherwise: (ctx) => ctx.reply("Please select a weekday.") },
  );
  await dayUpdate.answerCallbackQuery();
  if (dayUpdate.callbackQuery.data === cancelData) {
    await ctx.reply("Cancelled.");
    return;
  }
  const dayNumber = Number(dayUpdate.callbackQuery.data.replace("list:", ""));
  const dayLabel = weekdays.find((d) => d.value === dayNumber)!.label;

  const events = await conversation.external(() => listEvents(dayNumber));

  if (events.length === 0) {
    await ctx.reply(`No events found for ${dayLabel}.`);
    return;
  }

  let otherIndex = 1;
  for (const event of events) {
    let caption = `weekday: ${dayLabel}\ntype: ${event.type}`;
    if (event.type === "other") {
      caption += ` ${otherIndex}`;
      otherIndex++;
    }
    await ctx.replyWithPhoto(new InputFile(event.imageBuffer), { caption });
  }
}
