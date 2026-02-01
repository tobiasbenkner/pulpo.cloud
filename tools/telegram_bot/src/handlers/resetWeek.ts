import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { BotContext } from "../bot.js";
import { config } from "../config.js";
import { mainMenu } from "./start.js";

type ResetConversation = Conversation<BotContext, Context>;

export async function resetWeekConversation(
  conversation: ResetConversation,
  ctx: Context,
) {
  const confirmKeyboard = new InlineKeyboard()
    .text("Yes", "reset:yes")
    .text("No", "reset:no");

  await ctx.reply("Are you sure you want to reset the week?", {
    reply_markup: confirmKeyboard,
  });

  const update = await conversation.waitForCallbackQuery(
    ["reset:yes", "reset:no"],
    { otherwise: (ctx) => ctx.reply("Please select Yes or No.") },
  );
  await update.answerCallbackQuery();

  if (update.callbackQuery.data === "reset:no") {
    await ctx.reply("Cancelled.", { reply_markup: mainMenu });
    return;
  }

  await ctx.reply("Triggering reset...");

  try {
    await conversation.external(async () => {
      const res = await fetch(config.n8nWebhookUrl, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    });
    await ctx.reply("Week reset triggered successfully.", {
      reply_markup: mainMenu,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.reply(`Failed to trigger reset: ${message}`, {
      reply_markup: mainMenu,
    });
  }
}
