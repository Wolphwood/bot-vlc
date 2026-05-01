import { ApplicationCommandType, ApplicationCommandOptionType, Message } from "discord.js";

import { noop, uncachedImport } from "#modules/Utils";
import { PERMISSION } from "#constants";
import { Locales } from "#modules/Locales"
import Emotes from "#modules/Emotes"

const { GameSmashOrPass } = await uncachedImport("#modules/menus/sop/index");

export default {
  name: "SmashOrPass",
  aliases: ['sop'],
  userPermission: PERMISSION.USER,
  discord: {
    type: ApplicationCommandType.ChatInput,
  },
  run: async ({client, interaction, message, userPermission, GuildData, UserData, LangToUse }) => {
    let discordElement = message ?? interaction;
    
    await GameSmashOrPass({ client, discordElement, GuildData, UserData, userPermission, LangToUse });
    if (message) message.delete().catch(noop);
  },
};