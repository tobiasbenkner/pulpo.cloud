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
import { listEventsConversation } from "./handlers/listEvents.js";
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
bot.use(createConversation(listEventsConversation));

// Commands
bot.command("start", handleStart);
bot.command("upload", async (ctx) => {
  await ctx.conversation.enter("uploadEventConversation");
});
bot.command("reset", handleResetWeek);
bot.command("list", async (ctx) => {
  await ctx.conversation.enter("listEventsConversation");
});

// Reply keyboard handlers
bot.hears("Reset Week", handleResetWeek);
bot.hears("List Events", async (ctx) => {
  await ctx.conversation.enter("listEventsConversation");
});
bot.hears("Upload Event", async (ctx) => {
  await ctx.conversation.enter("uploadEventConversation");
});

bot.command("cancel", async (ctx) => {
  await ctx.conversation.exit("uploadEventConversation");
  await ctx.reply("Cancelled.");
});

bot.start();
console.log("Bot is running...");
