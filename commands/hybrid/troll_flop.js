import Locales from "#modules/Locales";
import { deleteAfter } from "#modules/Utils";

export default {
  name: "flop",
  aliases: ["wolph", "wolphwood"],
  category: "fun",
  secret: true,
  run: async ({ interaction, message }) => {
    const discordElement = interaction || message;

    discordElement.reply(Locales.get("command.flop.yeaaaaaah")).then(m => deleteAfter(m, 2000));
  },
};