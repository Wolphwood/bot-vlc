import { ApplicationCommandType, EmbedBuilder } from "discord.js";
import { PERMISSION } from "#constants";
import os from "#modules/osutils";
import Locale from "#modules/Locales";
import { getRandomRangeRound, SecToStr } from "#modules/Utils";

const emptyString = Array.from(Array(4000), () => `\u200b`).join(' ');

export default {
  name: "botinfo",
  aliases: ['bot', 'info'],
  userPermission: PERMISSION.USER,
  discord: {
    type: ApplicationCommandType.ChatInput,
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    let discordElement = message || interaction;
    let { member } = discordElement;

    const cpu_usage = Math.round((await os.cpuUsage()) * 10000) / 100;
    const mem_total = os.totalmem({ round: 2 });
    const mem_usage = os.usedmem({ round: 2 });
    const mem_usage_percent = Math.round(os.freememPercentage() * 100).toFixed(2);

    let embed = new EmbedBuilder()
      .setTitle(Locale.get("command.botinfo.embed.title"))
      .setDescription(Locale.get("command.botinfo.embed.description", [client.user.username, client.config.version]))
      .setThumbnail(client.user.avatarURL({ format: 'jpg', size: 512, dynamic: true }))
      .addFields([
        {
          name: Locale.get("command.botinfo.embed.field.api.title") + emptyString.slice(0, 10),
          value: client.APIs.map(api => `• [${api.name}](${api.link})`).join('\n') || 'None',
          inline: true,
        },
        {
          name: Locale.get("command.botinfo.embed.field.contributor.title"),
          value: Locale.get("command.botinfo.embed.field.contributor.value", null, { array: true }).join('\n'),
          inline: true,
        },
        {
          name: Locale.get("command.botinfo.embed.field.server.title"),
          value: [
            `CPU Usage : ${cpu_usage}%`,
            `Memory Usage : ${mem_usage.value + mem_usage.format.toUcFirst()} / ${mem_total.value + mem_total.format.toUcFirst()} (${mem_usage_percent}%)`,
            `Average Load : ${os.loadavg(1)}, ${os.loadavg(5)}, ${os.loadavg(15)}`,
            `System Uptime : ${SecToStr(Math.round(os.sysUptime()))}`,
            `Process Uptime : ${SecToStr(Math.round(os.processUptime()))}`,
            ``,
          ].join('\n'),
          inline: false,
        }
      ])
      .setColor(Array.from(Array(3), () => getRandomRangeRound(127, 255)))
      .setFooter({ text: Locale.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
      .setTimestamp();

    discordElement.reply({ embeds: [embed] });
  },
};