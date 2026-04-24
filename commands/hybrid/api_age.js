import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType } from 'discord.js';
import Locale from '#modules/Locales';
import { Wait, getRandomRangeRound } from '#modules/Utils';


const API_URL = "https://api.agify.io/";

export function load(client) {
  client.APIs.push({ name: "Agify", link: API_URL });
}

export default {
  name: "age",
  aliases: ["agify"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "name",
        description: Locale.get(`commandinfo.age.option.nom.description`),
        required: true,
      },
    ],
  },
  run: async ({ client, interaction, message, args, LangToUse }) => {
    const discordElement = message || interaction;
    const member = discordElement.member;

    // Récupération du nom selon le type de commande (Hybride)
    // Si c'est une interaction, on cherche dans les options, sinon dans les args du message
    let name = interaction 
      ? interaction.options.getString('name') 
      : args[0];

    if (!name) {
      return discordElement.reply({ 
        content: Locale.get("command.age.error.no_name") 
      });
    }

    try {
      const response = await fetch(`${API_URL}?${new URLSearchParams({ name })}`);

      if (response.status === 429) {
        return discordElement.reply({ content: Locale.get("command.age.error.429") });
      }

      if (!response.ok) {
        const msg = await discordElement.reply({ 
          content: Locale.get("command.age.error.api_failure"),
          fetchReply: true 
        });
        
        if (message) {
          Wait(5000).then(() => msg.delete().catch(() => {}));
        }
        return;
      }

      const data = await response.json();
      
      const embed = new EmbedBuilder()
        .setColor([getRandomRangeRound(80, 255), getRandomRangeRound(80, 255), getRandomRangeRound(80, 255)])
        .addFields([{
          name: Locale.get("command.age.embed.field.name", name.toUcFirst()),
          value: Locale.get("command.age.embed.field.value", [data.count, name, data.age || '?']),
        }])
        .setFooter({ 
          text: Locale.get("generic.embed.footer", [
            (interaction?.guild?.members?.me?.displayName || client.user.username),
            client.config.version,
            (member.displayName || member.user.username)
          ]) 
        })
        .setTimestamp();

      return discordElement.reply({ embeds: [embed] });

    } catch (error) {
      console.error(`[API ERROR: ${name}]`, error);
      return discordElement.reply({ 
        content: Locale.get("command.age.error.api_failure") 
      });
    }
  },
};