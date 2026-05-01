import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType } from "discord.js";
import Locale from "#modules/Locales";
import { getRandomRangeRound, Wait } from "#modules/Utils";

const IMAGE_API = "https://random-d.uk/api/v2";

export const load = async (client) => {
  if (!client.APIs.some(a => a.link === IMAGE_API)) {
    client.APIs.push({ name: "Random Duck", link: IMAGE_API });
  }
};

export async function FetchImageAPI() {
  try {
    const data = await fetch(`${IMAGE_API}/quack`, { headers: { 'Accept': 'application/json' } }).then(r => r.json());
    return data.url;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default {
  name: "duck",
  aliases: ["canard", "kanar"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "quack",
        aliases: ["image", "img", "i"],
        description: Locale.get(`commandinfo.duck.option.image.description`),
      },
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    let discordElement = message || interaction;
    let member = discordElement.member;

    let subcommand = "image";

    let embed, response, data;
    switch (subcommand.toLowerCase().simplify()) {
      default:
        try {
          // CALL API
          response = await fetch(IMAGE_API + "/quack");
        } catch {}

        if (response.status !== 200) { // Handle API's failures
          discordElement.reply({
            content: Locale.get("command.duck.error.api_failure"),
          }).then(m => {
            if (message) Wait(5_000).then(() => m.delete());
          });
          return false;
        }

        data = await response.json();
        embed = new EmbedBuilder()
          .setColor(Array.from(Array(3), () => getRandomRangeRound(127, 255)))
          .setImage(data.url)
          .setFooter({ text: Locale.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
          .setTimestamp();

        if (interaction) interaction.reply({ embeds: [embed] });
        if (message) message.channel.send({ embeds: [embed] });
        break;
    }
  },
};