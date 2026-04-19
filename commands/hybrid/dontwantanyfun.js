import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonStyle, ComponentType, TextInputStyle, ChannelType } from 'discord.js';
import Emotes from '#modules/Emotes';
import Locale from '#modules/Locales';
import { getRandomRangeFloor, Wait, noop } from '#modules/Utils';
import { COMMAND_TYPE } from '#constants';

export default {
  name: "idontwantanyfun",
  aliases: ["dontwantanyfun","nofunforme",'nofun','jevaismefairefoutre'],
  category: 'utils',
  discord: {
    type: ApplicationCommandType.ChatInput,
  },
  run: async ({ interaction, message, args, GuildData, UserData, LangToUse, userPermission }) => {
    let discordElement = message || interaction;
    
    UserData.dontwantanyfun = !UserData.dontwantanyfun;
    await UserData.save();

    console.log(UserData)

    discordElement.reply({
        content: UserData.dontwantanyfun ? "Oh.. ok.." : 'LEZGO LA TEAM',
    }).then(m => {
        if (message) {
            message.delete().catch(() => {});
            Wait(5_000).then(() => m.delete()).catch(() => {});
        }
    });
  },
};
