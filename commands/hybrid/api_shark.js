import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import Locale from "#modules/Locales";

export default {
  name: "shark",
  aliases: ["requin"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "image",
        aliases: ["img", "i"],
        description: Locale.get(`commandinfo.shark.option.image.description`),
      },
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    let discordElement = message || interaction;
    discordElement.reply(`Arrête, y'a pas d'API de requin <:notlikethis:1499722823697174712>`);
  },
};