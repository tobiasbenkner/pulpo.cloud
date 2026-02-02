import { Bot } from "grammy";
import {
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import type { Context } from "grammy";
import { config } from "./config.js";
import { handleStart } from "./handlers/start.js";
import { resetWeekConversation } from "./handlers/resetWeek.js";
import { listEventsConversation } from "./handlers/listEvents.js";
import { uploadAgendaConversation } from "./handlers/uploadAgenda.js";

export type BotContext = ConversationFlavor<Context>;

const bot = new Bot<BotContext>(config.botToken);

// Access control middleware
bot.use(async (ctx, next) => {
  if (!ctx.from || !config.allowedUserIds.includes(ctx.from.id)) {
    if (ctx.from && ctx.hasCommand("start")) {
      await ctx.reply(`You are not authorized to use this bot.\nYour ID: ${ctx.from.id}`);
    }
    return;
  }
  await next();
});

// Conversations plugin
bot.use(conversations());

// Exit active conversations when a main menu button or /cancel is used
const menuButtons = ["Reset Week", "List Events", "Upload Agenda"];
bot.use(async (ctx, next) => {
  const text = ctx.message?.text;
  if (text && (menuButtons.includes(text) || text === "/cancel")) {
    await ctx.conversation.exit("resetWeekConversation");
    await ctx.conversation.exit("listEventsConversation");
    await ctx.conversation.exit("uploadAgendaConversation");
  }
  await next();
});
bot.use(createConversation(resetWeekConversation));
bot.use(createConversation(listEventsConversation));
bot.use(createConversation(uploadAgendaConversation));

// Commands
bot.command("start", handleStart);
bot.command("reset", async (ctx) => {
  await ctx.conversation.enter("resetWeekConversation");
});
bot.command("list", async (ctx) => {
  await ctx.conversation.enter("listEventsConversation");
});
bot.command("agenda", async (ctx) => {
  await ctx.conversation.enter("uploadAgendaConversation");
});

// Reply keyboard handlers
bot.hears("Reset Week", async (ctx) => {
  await ctx.conversation.enter("resetWeekConversation");
});
bot.hears("List Events", async (ctx) => {
  await ctx.conversation.enter("listEventsConversation");
});
bot.hears("Upload Agenda", async (ctx) => {
  await ctx.conversation.enter("uploadAgendaConversation");
});

bot.command("cancel", async (ctx) => {
  await ctx.conversation.exit("listEventsConversation");
  await ctx.conversation.exit("uploadAgendaConversation");
  await ctx.reply("Cancelled.");
});

bot.start();
console.log("Bot is running...");
