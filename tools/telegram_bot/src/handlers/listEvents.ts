import { InputFile, InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot.js";
import { listEvents, deleteEventImage } from "../services/pocketbase.js";
import type { EventEntry } from "../services/pocketbase.js";

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

function buildCaption(
  dayLabel: string,
  event: EventEntry,
  otherIndex?: number,
) {
  let caption = `weekday: ${dayLabel}\ntype: ${event.type}`;
  if (event.type === "other" && otherIndex !== undefined) {
    caption += ` ${otherIndex}`;
  }
  return caption;
}

function buildDeleteLabel(event: EventEntry, otherIndex?: number) {
  if (event.type === "flyer") return "flyer";
  return `other ${otherIndex}`;
}

export async function listEventsConversation(
  conversation: ListConversation,
  ctx: Context,
) {
  const cancelData = "cancel";
  const doneData = "done";

  // Step 1: Pick weekday
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

  // Step 2: List events
  const events = await conversation.external(() => listEvents(dayNumber));

  if (events.length === 0) {
    await ctx.reply(`No events found for ${dayLabel}.`);
    return;
  }

  let otherIndex = 1;
  const otherIndices: Map<number, number> = new Map();
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const idx = event.type === "other" ? otherIndex++ : undefined;
    otherIndices.set(i, idx!);
    const caption = buildCaption(dayLabel, event, idx);
    await ctx.replyWithPhoto(new InputFile(event.imageBuffer), { caption });
  }

  // Step 3: Delete loop
  const remaining = events.map((e, i) => ({
    event: e,
    label: otherIndices.get(i),
  }));

  while (remaining.length > 0) {
    const deleteKeyboard = new InlineKeyboard();
    for (let i = 0; i < remaining.length; i++) {
      const label = buildDeleteLabel(remaining[i].event, remaining[i].label);
      deleteKeyboard.text(`Delete ${label}`, `del:${i}`);
    }
    deleteKeyboard.row().text("Done", doneData);
    await ctx.reply("Delete an image?", { reply_markup: deleteKeyboard });

    const validCallbacks = [...remaining.map((_, i) => `del:${i}`), doneData];
    const delUpdate = await conversation.waitForCallbackQuery(validCallbacks, {
      otherwise: (ctx) => ctx.reply("Please select an option."),
    });
    await delUpdate.answerCallbackQuery();

    if (delUpdate.callbackQuery.data === doneData) {
      await ctx.reply("Done.");
      return;
    }

    const idx = Number(delUpdate.callbackQuery.data.replace("del:", ""));
    const toDelete = remaining[idx];
    const deleteLabel = buildDeleteLabel(toDelete.event, toDelete.label);

    await conversation.external(() =>
      deleteEventImage(
        toDelete.event.recordId,
        toDelete.event.filename,
        toDelete.event.type,
      ),
    );
    remaining.splice(idx, 1);
    await ctx.reply(`Deleted ${deleteLabel}.`);
  }

  await ctx.reply("No more images left.");
}
