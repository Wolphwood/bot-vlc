import { ApplicationCommandType, ApplicationCommandOptionType } from 'discord.js';
import Locale from '#modules/Locales';

import { HelpMenu } from '#modules/menus/help/index';

export default {
  name: "help",
  aliases: ['aide', 'h', 'oskour', '?'],
  category: 'general',
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "search",
        description: Locale.get(`commandinfo.help.option.search.description`),
      },
    ],
  },
  run: async ({ client, interaction, message, GuildData, UserData, userPermission }) => {
    let discordElement = interaction || message;

    HelpMenu({ client, discordElement, GuildData, UserData, userPermission });
  },
};