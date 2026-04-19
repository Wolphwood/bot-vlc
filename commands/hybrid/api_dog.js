import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, TextInputStyle } from "discord.js";
import Locale from "#modules/Locales";
import Emotes from "#modules/Emotes";
import { getRandomRangeRound, getRandomRangeFloor, Wait, noop } from "#modules/Utils";

const API = "https://dog.ceo/api";

// Utilisation de l'export load pour le loader
export const load = async (client) => {
  if (!client.APIs.some(a => a.link === API)) {
    client.APIs.push({ name: "Dog CEO API", link: API });
  }
};

export async function FetchImageAPI() {
  try {
    const data = await fetch(`${API}/breeds/image/random/`, { headers: { 'Accept': 'application/json' } }).then(r => r.json());
    if (data.success !== "success") return data.message
    else throw new Error(data.message);
  } catch (err) {
    console.error(err);
    return null;
  }
}

export default {
  name: "dog",
  aliases: ["chien"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "image",
        description: Locale.get(`commandinfo.dog.option.image.description`),
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "breeds",
        description: Locale.get(`commandinfo.dog.option.breeds.description`),
      },
    ],
  },
    
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    const discordElement = message || interaction;
    const member = discordElement.member;

    let subcommand = args.shift() || "image";

    let embed, response, data;
    switch (subcommand.toLowerCase().simplify()) {
      case "image": case "img": case "i":
        try {
          response = await fetch(API + "breeds/image/random/");
          if (response.status !== 200) throw new Error();
        } catch {
          const m = await discordElement.reply({ content: Locale.get("command.dig.error.api.dogceo.failure") });
          if (message) Wait(5_000).then(() => m.delete());
          return false;
        }

        data = await response.json();
        embed = new EmbedBuilder()
          .setColor(Array.from(Array(3), () => getRandomRangeRound(127, 255)))
          .setImage(data.message)
          .setFooter({ text: Locale.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
          .setTimestamp();

        return interaction ? interaction.reply({ embeds: [embed] }) : message.channel.send({ embeds: [embed] });

      case "breed": case "breeds": case "espece": case "especes":
        response = await fetch(API + "breeds/list/all/");
        if (response.status !== 200) {
          const m = await discordElement.reply({ content: Locale.get("command.dig.error.api.dogceo.failure") });
          if (message) Wait(5_000).then(() => m.delete());
          return false;
        }

        data = await response.json();
        const pages = Object.keys(data.message).map((breed) => ({
          name: Locale.get("command.dog.breeds.embed.field.name", breed),
          value: Locale.get("command.dog.breeds.embed.field.value", data.message[breed].map(subBreed => `${breed} ${subBreed}`).join('\n') || 'None') + '\n\u200b',
        })).chunkOf(5); // .chunkOf supposé être une extension d'Array

        return EmbedMenu({ client, interaction, message, member, pages, LangToUse });
    }
  },
};

// --- Fonctions utilitaires ---

async function EmbedMenu({ client, interaction, message, member, pages, LangToUse }) {
  const NohtingImage = 'https://media0.giphy.com/media/3o7abAHdYvZdBNnGZq/giphy.gif';
  const TimeoutImage = 'https://media2.giphy.com/media/1d7F9xyq6j7C1ojbC5/giphy.gif';

  const embed = new EmbedBuilder()
    .setTitle(Locale.get("command.dog.breeds.embed.title"))
    .setFields(pages[0])
    .setColor(Array.from(Array(3), () => getRandomRangeFloor(127, 255)))
    .setFooter({ text: Locale.get("command.dog.breeds.embed.footer", [client.user.username, client.config.version, 1, 1, pages.length]) })
    .setTimestamp();

  const discordElement = interaction || message;
  if (interaction) await interaction.deferReply();

  const uid = discordElement.id;
  const Speeds = [1, 5, 10];
  let page = 0;
  let pageSpeed = 0;

  const MessageMenu = await discordElement[interaction ? 'editReply' : 'reply']({ 
    embeds: [embed], 
    components: GetMenuButtons({ uid, page, pageSize: pages.length, pageSpeed, LangToUse }) 
  });

  const MenuCollector = MessageMenu.createMessageComponentCollector({ 
    filter: (i) => i.customId.startsWith(uid) && i.user.id === member.id, 
    idle: 120_000 
  });

  MenuCollector.on('end', async (collected, reason) => {
    const images = { idle: TimeoutImage, user: NohtingImage };
    await MessageMenu.edit({ 
      components: [], 
      embeds: [
        new EmbedBuilder()
          .setDescription(Locale.get("command.dog.breeds.embed.closereason." + reason))
          .setColor(embed.data.color)
          .setImage(images[reason] || images.idle)
      ]
    });
    if (!interaction) {
      await MessageMenu.react('🔒');
      setTimeout(() => MessageMenu.delete(), 5000);
    }
  });

  MenuCollector.on('collect', async (collectedInteraction) => {
    const action = collectedInteraction.customId.split(':')[1];

    switch (action) {
      case "dog-breed-page-left":
        page = Math.max(0, page - Speeds[pageSpeed]);
        break;
      case "dog-breed-page-right":
        page = Math.min(pages.length - 1, page + Speeds[pageSpeed]);
        break;
      case "dog-breed-page-speed-down":
        pageSpeed = Math.max(0, pageSpeed - 1);
        break;
      case "dog-breed-page-speed-up":
        pageSpeed = Math.min(Speeds.length - 1, pageSpeed + 1);
        break;
      case "dog-breed-page-goto":
        const value = await GetInput({
          interaction: collectedInteraction,
          title: Locale.get("command.dog.breeds.modal.goto.title"),
          label: Locale.get("command.dog.breeds.modal.goto.label"),
          placeholder: Locale.get("command.dog.breeds.modal.goto.placeholder", [1, pages.length]),
          type: Number,
          default: 1
        });
        page = Math.between(0, value - 1, pages.length - 1);
        break;
      case "dog-breed-button-close":
        return MenuCollector.stop('user');
    }

    if (!collectedInteraction.deferred) await collectedInteraction.deferUpdate().catch(noop);

    embed.setFields(pages[page]);
    embed.setFooter({ text: Locale.get("command.dog.breeds.embed.footer", [client.user.username, client.config.version, Speeds[pageSpeed], page + 1, pages.length]) });

    await MessageMenu.edit({
      embeds: [embed],
      components: GetMenuButtons({ uid, page, pageSize: pages.length, pageSpeed, LangToUse })
    });
  });
}

function GetMenuButtons({ uid, page, pageSize, pageSpeed }) {
  const EmojiLeft = [Emotes.chevron.black.left.simple, Emotes.chevron.black.left.double, Emotes.chevron.black.left.triple];
  const EmojiRight = [Emotes.chevron.black.right.simple, Emotes.chevron.black.right.double, Emotes.chevron.black.right.triple];

  const rows = [
    {
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, customId: `${uid}:dog-breed-page-left`, style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(EmojiLeft[pageSpeed]), disabled: page === 0 },
        { type: ComponentType.Button, customId: `${uid}:dog-breed-page-speed-down`, style: ButtonStyle.Secondary, emoji: { name: '➖' }, disabled: pageSpeed === 0 },
        { type: ComponentType.Button, customId: `${uid}:dog-breed-page-goto`, style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(Emotes.compass.black) },
        { type: ComponentType.Button, customId: `${uid}:dog-breed-page-speed-up`, style: ButtonStyle.Secondary, emoji: { name: '➕' }, disabled: pageSpeed === EmojiLeft.length - 1 },
        { type: ComponentType.Button, customId: `${uid}:dog-breed-page-right`, style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(EmojiRight[pageSpeed]), disabled: page >= pageSize - 1 },
      ]
    },
    {
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, customId: `${uid}:dog-breed-button-close`, label: Locale.get("command.dog.breeds.button.close"), style: ButtonStyle.Secondary, emoji: { name: '🔒' } },
      ]
    }
  ];

  return pageSize > 1 ? rows : [rows[1]];
}

async function GetInput({ interaction, title, placeholder, label, type, default: def }) {
  const modalId = `${interaction.id}:modal`;
  const inputId = `${interaction.id}:modal-input`;

  await interaction.showModal({
    title,
    custom_id: modalId,
    components: [{
      type: ComponentType.ActionRow,
      components: [{
        type: ComponentType.TextInput,
        customId: inputId,
        label,
        style: TextInputStyle.Short,
        placeholder,
        required: true
      }]
    }]
  });

  try {
    const submitted = await interaction.awaitModalSubmit({ 
      filter: (i) => i.customId === modalId, 
      time: 60_000 
    });
    await submitted.deferUpdate().catch(noop);
    return type(submitted.fields.getTextInputValue(inputId));
  } catch {
    return def;
  }
}