import { ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";

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
      },
    ],
  },
  run: async ({ client, Locales, interaction, message, args, GuildData, UserData, LangToUse }) => {
    let discordElement = message || interaction;
    discordElement.reply(Locales.get("command.shark.STOP_IT_PLEASE"));
  },
};