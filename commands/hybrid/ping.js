import { COMMAND_TYPE } from "#constants";
import { noop } from "#modules/Utils";
import { ApplicationCommandType, EmbedBuilder } from 'discord.js';

export default {
  name: "ping",
  description: "Ping command",
  discord: {
    type: ApplicationCommandType.ChatInput,
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    if (interaction) {
      const msg = await interaction.channel.send({ content: "Ping..." });
      msg.delete();

      await interaction.reply({
        content: "\u200b",
        embeds: [getEmbed({ client, msg, interaction })]
      });
    }

    if (message) {
      const msg = await message.reply({ content: "Ping..." });
      await msg.edit({
        content: "\u200b",
        embeds: [getEmbed({ client, msg, message })]
      });
      setTimeout(() => msg.delete().catch(noop), 5000);
    }
  },
};

function getEmbed({ client, msg, message, interaction }) {
  // On récupère le timestamp de référence (soit message, soit interaction)
  const reference = message || interaction;
  
  // Note: Date.timestamp() n'existe pas nativement, j'utilise Math.floor(Date.now() / 1000)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const uptimeTimestamp = currentTimestamp - Math.round(client.uptime / 1000);

  return new EmbedBuilder()
    .setTitle('Pong 🏓')
    .setDescription([
      `**Server**: \`${msg.createdTimestamp - reference.createdTimestamp}ms\``,
      `**API**: \`${client.ws.ping}ms\``,
      `**Uptime**: \u200b <t:${uptimeTimestamp}:R>`
    ].join("\n"))
    // Utilisation de config.version que tu as importé dans app.js
    .setFooter({ text: `${client.user.username} v${client.config.version}` })
    .setColor([
      Math.floor(Math.random() * (255 - 127 + 1) + 127),
      Math.floor(Math.random() * (255 - 127 + 1) + 127),
      Math.floor(Math.random() * (255 - 127 + 1) + 127)
    ])
    .setImage('https://media4.giphy.com/media/fvA1ieS8rEV8Y/giphy.gif')
    .setTimestamp();
}