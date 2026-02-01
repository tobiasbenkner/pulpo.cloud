import { Keyboard } from "grammy";
import type { Context } from "grammy";

const mainMenu = new Keyboard()
  .text("Reset Week")
  .text("Upload Event")
  .text("List Events")
  .resized();

export async function handleStart(ctx: Context) {
  await ctx.reply("What would you like to do?", {
    reply_markup: mainMenu,
  });
}
