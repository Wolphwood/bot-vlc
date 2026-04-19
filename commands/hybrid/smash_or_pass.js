import { ApplicationCommandType, ApplicationCommandOptionType, Message } from "discord.js";

import { noop } from "#modules/Utils";
import { PERMISSION } from "#constants";
import { Locales } from "#modules/Locales"
import Emotes from "#modules/Emotes"

import { GameSmashOrPass } from "#modules/menus/sop/index"

export default {
  name: "SmashOrPass",
  aliases: ['sop'],
  userPermission: PERMISSION.USER,
  type: ApplicationCommandType.ChatInput,
  options: [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: "config",
    aliases: ['c', 'conf', 'cfg'],
    description: Locales.get(`commandinfo.smashorpass.option.config.description`),
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: "start",
    description: Locales.get(`commandinfo.smashorpass.option.start.description`),
  },
  ],
  run: async ({client, interaction, message, args, userPermission, GuildData, UserData, LangToUse }) => {
    let discordElement = message ?? interaction;
    let { member } = discordElement;

    let subcommand = args.shift();
    if (!subcommand) subcommand = "start";

    switch (subcommand.toLowerCase().simplify()) {
      case "start":
        await GameSmashOrPass({ client, discordElement, GuildData, UserData, userPermission });
        if (message) message.delete().catch(noop);
      break
      
      case "config":
      case "conf":
      case "cfg":
      case "c":
        if (userPermission < PERMISSION.GUILD_MOD) {
          return discordElement.reply({
          content:  Emotes.cancel +  ` You haven't permission for that`,
          ephemeral: true,
          }).then(e => !e.ephemeral ? Wait(3000).then(() => e.delete()) : null);
        }

        await ConfigCharacters({ client, client, discordElement, GuildData, UserData });

        if (discordElement instanceof Message) {
          message.delete().catch(noop);
        }
      break

      default:
        discordElement.reply({ content: `Unknown sub-command '${subcommand}'` });
      
    }
  },
};