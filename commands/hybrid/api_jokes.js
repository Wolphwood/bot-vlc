import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, MessageFlags, ComponentType, SeparatorSpacingSize, ButtonStyle } from "discord.js";
import config from "#config"

import BlaguesAPI from 'blagues-api';
import { isString, noop } from "#modules/Utils";
import Emotes from "#modules/Emotes";

const API = "https://www.blagues-api.fr/";

const blagues = new BlaguesAPI(config.apis.blagues.token);

const CATEGORY_COLORS = {
  [blagues.categories.GLOBAL]: 0x3498DB,
  [blagues.categories.DEV]: 0x2ECC71,
  [blagues.categories.DARK]: 0x2C3E50,
  [blagues.categories.LIMIT]: 0xE74C3C,
  [blagues.categories.BEAUF]: 0xF1C40F,
  [blagues.categories.BLONDES]: 0xFFE4B5
};

export const load = async (client) => {
  if (!client.APIs.some(a => a.link === API)) {
    client.APIs.push({ name: "Blagues API", link: API });
  }
};

export async function FetchJoke({ disallow = [], category = null } = {}) {
  try {
    return category
      ? await blagues.randomCategorized( category )
      : await blagues.random({ disallow })
    ;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default {
  name: "blague",
  aliases: ["joke"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "safe",
        description: "Que de l'humour safe",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "random",
        description: "ATTENTION: Cette commande active les blagues d'humour noir et les blagues limites.",
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "type",
        description: "Affiche une blague par catégorie",
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "categorie",
            description: "La catégorie souhaitée",
            required: true,
            choices: [
              { name: 'global',  value: blagues.categories.GLOBAL  },
              { name: 'dev',     value: blagues.categories.DEV     },
              { name: 'dark',    value: blagues.categories.DARK    },
              { name: 'limit',   value: blagues.categories.LIMIT   },
              { name: 'beauf',   value: blagues.categories.BEAUF   },
              { name: 'blondes', value: blagues.categories.BLONDES }
            ]
          }
        ]
      }
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    const discordElement = interaction || message;
    const member = discordElement.member;

    let subcommand = ['normal', 'random', 'type'].includes(args[0]?.toLowerCase()) ? args.shift() : "safe";
    let category = null;

    // Parse Args
    if (interaction) {
      if (subcommand === "type") {
        const index = args.findIndex(arg => arg.name === "categorie");
        if (index >= 0) category = args[index].value;
        else return interaction.reply(`${Emotes.crossmark} No "categorie" found`);
      }
    } else
    if (message) {
      if (args.length) {
        if (args[0].toLowerCase() === "all") category = null;
        else if (blagues.categories.values().includes(args[0].toLowerCase())) category = args.shift().toLowerCase();
        else return message.reply(`${Emotes.crossmark} No "categorie" found`);
      }
    }

    // Setup Settings
    const jokeOptions = { disallow: [], category };
    
    if (subcommand === "safe") {
      jokeOptions.disallow.push(blagues.categories.DARK, blagues.categories.LIMIT);
    }

    
    const jk = await FetchJoke(jokeOptions);
    if (!jk) return discordElement.reply(`${Emotes.crossmark} Une erreur s'est produite.`);

    await discordElement.reply({
      flags: [ MessageFlags.IsComponentsV2 ],
      components: [{
        type: ComponentType.Container,
        accent_color: CATEGORY_COLORS[jk.type] || 0xFFFFFF,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: [
              `## ${jk.joke}`,
              '',
              `### ||${/^(-|[0-9]+\.)/gi.test(jk.answer) ? '\\'+ jk.answer : jk.answer}||`,
              '',
            ].join('\n')
          },
          {
            type: ComponentType.Separator,
            divider: true,
            spacing: SeparatorSpacingSize.Small
          },
          {
            type: ComponentType.TextDisplay,
            content: `-# \`[${jk.id}]\` Catégorie \`${jk.type}\``
          },
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                label: "Supprimer",
                style: ButtonStyle.Secondary,
                customId: `DELETE:GUILD_ADMIN:${member.id}`
              }
            ]
          },
        ]
      }]
    });

    if (message) discordElement.delete().catch(noop);
  },
};