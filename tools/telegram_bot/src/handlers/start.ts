import { Keyboard } from "grammy";
import type { Context } from "grammy";

export const mainMenu = new Keyboard()
  .text("Reset Week")
  .text("List Events")
  .text("Upload Agenda")
  .resized();

export async function handleStart(ctx: Context) {
  await ctx.reply("What would you like to do?", {
    reply_markup: mainMenu,
  });
}
