import { Bot } from "grammy";
import {
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import type { Context } from "grammy";
import { config } from "./config.js";
import { handleStart } from "./handlers/start.js";
import { handleResetWeek } from "./handlers/resetWeek.js";
import { uploadEventConversation } from "./handlers/uploadEvent.js";

export type BotContext = ConversationFlavor<Context>;

const bot = new Bot<BotContext>(config.botToken);

// Access control middleware
bot.use(async (ctx, next) => {
  if (!ctx.from || !config.allowedUserIds.includes(ctx.from.id)) {
    return;
  }
  await next();
});

// Conversations plugin
bot.use(conversations());
bot.use(createConversation(uploadEventConversation));

// Commands
bot.command("start", handleStart);

// Reply keyboard handlers
bot.hears("Reset Week", handleResetWeek);
bot.hears("Upload Event", async (ctx) => {
  await ctx.conversation.enter("uploadEventConversation");
});

bot.start();
console.log("Bot is running...");
