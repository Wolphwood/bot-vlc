import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, TextInputStyle } from "discord.js";
// import client from "#app";
import Locales from "#modules/Locales";
import { getRandomRangeRound, getRandomRangeFloor, Wait, deleteAfter, noop, ResolveSubCommand } from "#modules/Utils";
import Emotes from "#modules/Emotes";

const API = "https://catfact.ninja/";
const IMAGE_API = "https://cataas.com";

export function load(client) {
  client.APIs.push({ name: "Cat Fact", link: API });
  client.APIs.push({ name: "Cat as a service", link: IMAGE_API });
}

export async function FetchImageAPI(gif = false, fullObject = false) {
  try {
    const data = await fetch(`${IMAGE_API}/cat` + (gif ? '/gif' : ''), { headers: { 'Accept': 'application/json' } }).then(r => r.json());
    return fullObject ? data : data.url;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default {
  name: "Cat",
  aliases: ["Chat"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "Image",
        aliases: [ "img", "i" ]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "GIF",
        aliases: [ "g", "animated", "animée", "animé" ]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "Fact",
        aliases: [ "anecdote" ]
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "Breeds",
        aliases: [ "breed", "espece", "especes" ]
      },
    ],
  },

  run: async ({ client, command, interaction, message, args, GuildData, UserData, LangToUse }) => {
    let discordElement = message || interaction;
    let member = discordElement.member;

    let subcommand = ResolveSubCommand(command, args.shift())?.name ?? "image";

    let embed, response, data;
    switch (subcommand.toLowerCase().simplify()) {
      case "image": {
        const data = await FetchImageAPI(false, true);

        if (!data) {
          discordElement.reply({
            content: Locales.get("command.cat.error.api.cataas.failure"),
          }).then(m => deleteAfter(m, 5000)).catch(noop);
          return false;
        }

        embed = new EmbedBuilder()
          .setColor([getRandomRangeRound(127, 255), getRandomRangeRound(127, 255), getRandomRangeRound(127, 255)])
          .setImage(data.url)
          .setFooter({ text: Locales.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
          .setTimestamp();

        if (interaction) interaction.reply({ embeds: [embed] });
        if (message) message.channel.send({ embeds: [embed] });
        break;
      }

      case "gif": {
        try {
          response = await fetch(`${IMAGE_API}/cat/gif`, { headers: { 'Accept': 'application/json' } });
        } catch {}

        if (response?.status !== 200) {
          discordElement.reply({
            content: Locales.get("command.cat.error.api.cataas.failure"),
          }).then(m => {
            if (message) Wait(5_000).then(() => m.delete());
          });
          return false;
        }

        data = await response.json();
        const imageBuffer = await getImageBuffer(data.url);

        const files = [{
          attachment: imageBuffer,
          name: `${data.id}.gif` // C'est ici qu'on "force" l'extension pour Discord
        }];

        embed = new EmbedBuilder()
          .setColor([getRandomRangeRound(127, 255), getRandomRangeRound(127, 255), getRandomRangeRound(127, 255)])
          .setImage(`attachment://${data.id}.gif`)
          .setFooter({ text: Locales.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
          .setTimestamp();

        if (interaction) interaction.reply({ embeds: [embed], files });
        if (message) message.channel.send({ embeds: [embed], files });
        break;
      }

      case "fact": {
        try {
          response = await fetch(API + "fact");
        } catch {}

        if (response.status !== 200) {
          discordElement.reply({
            content: Locales.get("command.cat.error.api.catfact.failure"),
          }).then(m => {
            if (message) Wait(5_000).then(() => m.delete());
          });
          return false;
        }

        data = await response.json();
        await discordElement.reply({ content: data.fact });
        break;
      }

      case "breeds": {
        try {
          response = await fetch(API + "breeds" + "?" + new URLSearchParams({
            limit: 99999999,
          }));
        } catch {}

        if (response.status !== 200) {
          discordElement.reply({
            content: Locales.get("command.cat.error.api.catfact.failure"),
          }).then(m => {
            if (message) Wait(5_000).then(() => m.delete());
          });
          return false;
        }

        data = await response.json();
        let pages = data.data.map(({ breed, country, origin, coat, pattern }) => Object({
          name: Locales.get("command.cat.breeds.embed.field.name", breed),
          value: Locales.get("command.cat.breeds.embed.field.value", [pattern || '?', country || '?', origin || '?', coat || '?']) + '\n\u200b',
        })).chunkOf(5);
        EmbedMenu({ interaction, message, member, pages, LangToUse });
        break;
      }
    }
  },
};

async function getImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Erreur lors du téléchargement: ${response.statusText}`);
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function EmbedMenu({ interaction, message, member, pages, LangToUse }) {
  const NohtingImage = 'https://media4.giphy.com/media/ES4Vcv8zWfIt2/giphy.gif';
  const TimeoutImage = 'https://media2.giphy.com/media/11dR2hEgtN5KoM/giphy.gif';

  const embed = new EmbedBuilder()
    .setTitle(Locales.get("command.cat.breeds.embed.title"))
    .setFields(pages[0])
    .setColor([getRandomRangeFloor(127, 255), getRandomRangeFloor(127, 255), getRandomRangeFloor(127, 255)])
    .setFooter({ text: Locales.get("command.cat.breeds.embed.footer", [client.user.username, client.config.version, 1, 1, pages.length]) })
    .setTimestamp();

  let discordElement = interaction || message;
  if (interaction) await interaction.deferReply();
  if (!discordElement) throw new Error("discordElement is not defined.");

  const uid = discordElement.id;
  const Speeds = [1, 5, 10];
  let page = 0;
  let pageSpeed = 0;

  let MessageMenu = await discordElement[interaction ? 'editReply' : 'reply']({ embeds: [embed], components: GetMenuButtons({ uid, page, pageSize: pages.length, pageSpeed, LangToUse }) });

  async function MessageMenuFilter(collectedInteraction) {
    if (collectedInteraction.user.id !== member.id) await collectedInteraction.deferUpdate();
    return collectedInteraction.customId.startsWith(uid) && collectedInteraction.user.id === member.id;
  };
  const MenuCollector = MessageMenu.createMessageComponentCollector({ filter: MessageMenuFilter, idle: 2 * 60 * 1000 });

  MenuCollector.on('end', async (collected, reason) => {
    let image = { idle: TimeoutImage, user: NohtingImage };
    await MessageMenu.edit({
      components: [], embeds: [{
        description: Locales.get("command.cat.breeds.embed.closereason." + reason),
        color: embed.data.color,
        image: { url: image[reason] },
      }]
    });
    // MessageMenu.react peut échouer sur une interaction
    if (message) await MessageMenu.react('🔒').catch(() => {});
  });

  MenuCollector.on('collect', async (collectedInteraction) => {
    switch (collectedInteraction.customId.split(':')[1]) {
      case "cat-breed-page-left":
        page -= Speeds[pageSpeed];
        if (page < 0) page = 0;
        embed.setFields(pages[page]);
        break;

      case "cat-breed-page-speed-down":
        pageSpeed -= 1;
        break;

      case "cat-breed-page-speed-up":
        pageSpeed += 1;
        break;

      case "cat-breed-page-right":
        page += Speeds[pageSpeed];
        if (page > pages.length - 1) page = pages.length - 1;
        embed.setFields(pages[page]);
        break;

      case "cat-breed-page-goto":
        let value = await GetInput({
          interaction: collectedInteraction,
          title: Locales.get("command.cat.breeds.modal.goto.title"),
          label: Locales.get("command.cat.breeds.modal.goto.label"),
          placeholder: Locales.get("command.cat.breeds.modal.goto.placeholder", [1, pages.length]),
          type: Number,
          default: 0
        });
        page = value - 1;
        if (isNaN(value) || value < 1) page = 0;
        if (value > pages.length) page = pages.length - 1;
        break;

      case "cat-breed-button-close":
        return MenuCollector.stop();
    }

    if (!collectedInteraction.deferred && !collectedInteraction.replied) await collectedInteraction.deferUpdate();

    embed.setFooter({ text: Locales.get("command.cat.breeds.embed.footer", [client.user.username, client.config.version, Speeds[pageSpeed], page + 1, pages.length]) });

    const payload = {
      embeds: [embed],
      components: GetMenuButtons({ uid: discordElement.id, page, pageSize: pages.length, pageSpeed, LangToUse }),
    };

    if (discordElement.editReply) {
      await discordElement.editReply(payload);
    } else {
      await MessageMenu.edit(payload);
    }
  });
}

function GetMenuButtons({ uid, page, pageSize, pageSpeed, LangToUse }) {
  if (page === undefined) page = 0;
  if (pageSpeed === undefined) pageSpeed = 0;

  const EmojiLeft = [Emotes.chevron.black.left.simple, Emotes.chevron.black.left.double, Emotes.chevron.black.left.triple];
  const EmojiRight = [Emotes.chevron.black.right.simple, Emotes.chevron.black.right.double, Emotes.chevron.black.right.triple];

  const ROWS = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          customId: uid + ":cat-breed-page-left",
          style: ButtonStyle.Secondary,
          emoji: Emotes.GetEmojiObject(EmojiLeft[pageSpeed]),
          disabled: (page === 0 || pageSize < 10)
        },
        {
          type: ComponentType.Button,
          customId: uid + ":cat-breed-page-speed-down",
          style: ButtonStyle.Secondary,
          emoji: { name: '➖' },
          disabled: (pageSpeed < 1)
        },
        {
          type: ComponentType.Button,
          customId: uid + ":cat-breed-page-goto",
          style: ButtonStyle.Secondary,
          emoji: Emotes.GetEmojiObject(Emotes.compass.black),
        },
        {
          type: ComponentType.Button,
          customId: uid + ":cat-breed-page-speed-up",
          style: ButtonStyle.Secondary,
          emoji: { name: '➕' },
          disabled: (pageSpeed > 1)
        },
        {
          type: ComponentType.Button,
          customId: uid + ":cat-breed-page-right",
          style: ButtonStyle.Secondary,
          emoji: Emotes.GetEmojiObject(EmojiRight[pageSpeed]),
          disabled: (page === pageSize - 1 || pageSize < 5)
        },
      ]
    },
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          customId: uid + ":cat-breed-button-close",
          label: Locales.get("command.cat.breeds.button.close"),
          style: ButtonStyle.Secondary,
          emoji: { name: '🔒' }
        },
      ]
    },
  ];
  if (pageSize === 1) ROWS.shift();
  return ROWS;
}

async function GetInput({ interaction, title = "\u200b", placeholder = "\u200b", label = "\u200b", type = String, default: default_value }) {
  const uid = interaction.id;
  const modal = {
    title,
    custom_id: uid + ":modal",
    components: [{
      type: ComponentType.ActionRow,
      components: [{
        type: ComponentType.TextInput,
        customId: uid + ":modal-input",
        label,
        style: TextInputStyle.Short,
        placeholder,
        required: true
      }]
    }]
  };
  await interaction.showModal(modal);

  async function modalFilter(interaction) {
    if (interaction.customId === modal.custom_id) {
      await interaction.deferUpdate();
      return true;
    }
  };

  try {
    let response = await interaction.awaitModalSubmit({ filter: modalFilter, time: 60 * 1000 });
    return type(response.fields.getTextInputValue(uid + ':modal-input'));
  } catch (error) {
    console.error(`[ MODAL-ERROR : ${Date.timestamp()} ]`, error);
    return default_value;
  }
};