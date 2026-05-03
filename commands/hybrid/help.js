import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonStyle, ComponentType, TextInputStyle, ChannelType } from 'discord.js';
import Emotes from '#modules/Emotes';
import Locale from '#modules/Locales';
import { getRandomRangeFloor, Wait, noop, uncachedImport } from '#modules/Utils';
import { COMMAND_TYPE } from '#constants';

import { HelpMenu } from '#modules/menus/help/index';

export default {
  name: "help",
  aliases: ['aide', 'h', 'oskour', '?'],
  category: 'general',
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "search",
        description: Locale.get(`commandinfo.help.option.search.description`),
      },
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse, userPermission }) => {
    let discordElement = interaction || message;
    let member = discordElement.member;

    let pages = await ParseArgs({ client, interaction, message, args, LangToUse, userPermission });
    if (pages === null) {
      const content = Locale.get("command.help.error.notfound", [(interaction || message).member.id]);
      if (interaction) interaction.reply({ content, ephemeral: true });
      if (message) message.channel.send(content).then(m => Wait(5_000).then(() => m.delete()));
      return;
    }

    HelpMenu({ client, discordElement, GuildData, UserData, userPermission });
  },
};

async function __HelpMenu({ client, interaction, message, member, pages, LangToUse, userPermission }) {
  const NohtingImage = 'https://media.giphy.com/media/13d2jHlSlxklVe/giphy.gif';
  const TimeoutImage = 'https://media.giphy.com/media/kDwIbnBqKe3D7BSqrt/giphy.gif';

  const embed = new EmbedBuilder()
    .setTitle(Locale.get("command.help.embed.title"))
    .setDescription(Locale.get("command.help.embed.description"))
    .setFields(pages[0])
    .setColor(Array.from(Array(3), () => getRandomRangeFloor(127, 255)))
    .setFooter({ text: Locale.get("command.help.embed.footer", [client.user.username, client.config.version, 1, 1, pages.length]) })
    .setTimestamp();

  let discordElement = interaction || message;
  if (interaction) await interaction.deferReply();

  const uid = discordElement.id;
  const Speeds = [1, 5, 10];
  let page = 0;
  let pageSpeed = 0;

  let MessageMenu = await discordElement[interaction ? 'editReply' : 'reply']({
    embeds: [embed],
    components: GetHelpButtons({ uid, page, pageSize: pages.length, pageSpeed, LangToUse })
  });

  const MenuCollector = MessageMenu.createMessageComponentCollector({
    filter: (i) => i.customId.startsWith(uid) && i.user.id === member.id,
    idle: 120_000
  });

  MenuCollector.on('end', async (collected, reason) => {
    let image = { idle: TimeoutImage, user: NohtingImage };
    await MessageMenu.edit({
      components: [],
      embeds: [{
        description: Locale.get("command.help.embed.closereason." + reason),
        color: embed.data.color,
        image: { url: image[reason] || image.idle },
      }]
    });
    if (message) {
      await MessageMenu.react('🔒')
      setTimeout(() => MessageMenu.delete().catch(noop), 5000);
    };
  });

  MenuCollector.on('collect', async (collectedInteraction) => {
    const action = collectedInteraction.customId.split(':')[1];

    switch (action) {
      case "help-page-left":
        page = Math.max(0, page - Speeds[pageSpeed]);
        embed.setFields(pages[page]);
        break;

      case "help-page-speed-down":
        pageSpeed = Math.max(0, pageSpeed - 1);
        break;

      case "help-page-speed-up":
        pageSpeed = Math.min(Speeds.length - 1, pageSpeed + 1);
        break;

      case "help-page-right":
        page = Math.min(pages.length - 1, page + Speeds[pageSpeed]);
        embed.setFields(pages[page]);
        break;

      case "help-page-goto":
        let value = await GetInput({
          interaction: collectedInteraction,
          title: Locale.get("command.help.modal.goto.title"),
          label: Locale.get("command.help.modal.goto.label"),
          placeholder: Locale.get("command.help.modal.goto.placeholder", [1, pages.length]),
          type: Number,
          default: 1
        });
        page = Math.between(0, value - 1, pages.length - 1);
        embed.setFields(pages[page]);
        break;

      case "help-new-search":
        let search = await GetInput({
          interaction: collectedInteraction,
          title: Locale.get("command.help.modal.new_search.title"),
          label: Locale.get("command.help.modal.new_search.label"),
          placeholder: Locale.get("command.help.modal.new_search.placeholder"),
          type: String,
          default: ''
        });

        let newArgs = interaction ? [{ name: 'search', value: search }] : search.split(/\s/gmi);
        let result = await ParseArgs({
          client,
          interaction: interaction ? discordElement : null,
          message,
          args: newArgs,
          LangToUse,
          userPermission
        });

        if (result === null) {
          discordElement.channel.send(Locale.get("command.help.error.notfound", [member.id])).then(m => Wait(5_000).then(() => m.delete()));
          return;
        }

        page = 0;
        pages = result;
        embed.setFields(pages[page]);
        break;

      case "help-button-close":
        return MenuCollector.stop('user');
    }

    if (!collectedInteraction.deferred && !collectedInteraction.replied) await collectedInteraction.deferUpdate();

    embed.setFooter({ text: Locale.get("command.help.embed.footer", [client.user.username, client.config.version, Speeds[pageSpeed], page + 1, pages.length]) });

    await MessageMenu.edit({
      embeds: [embed],
      components: GetHelpButtons({ uid, page, pageSize: pages.length, pageSpeed, LangToUse }),
    });
  });
}

async function ParseArgs({ client, interaction, message, args, LangToUse, userPermission }) {
  if (interaction && Array.isArray(args)) {
    args = args.find(arg => arg.name === 'search')?.value?.split(/\s/gmi) || [];
  }

  const DEBUGHELP = args[0]?.toLowerCase() === '--debug';
  if (DEBUGHELP) args.shift();

  const CommandType = {
    [COMMAND_TYPE.MESSAGE]: Emotes.command_icon.chat.white,
    [COMMAND_TYPE.SLASH]:   Emotes.command_icon.slash.white,
    [COMMAND_TYPE.HYBRID]:  Emotes.command_icon.hybrid.white,
  };

  
  let PermitedCommands = [...client.textCommands.values(), ...client.slashCommands.values(), ...client.hybridCommands.values()].filter(cmd => {
    let allowDM = (interaction || message).channel.type === ChannelType.DM ? cmd.dm : true;
    return allowDM && !cmd.hidden && userPermission >= (cmd.userPermission ?? 0);
  });

  let pages;
  if (['--all', '-a', '*'].includes(args[0]?.toLowerCase())) {
    pages = PermitedCommands.map(command => {
      let subcommands = (command.options || []).filter(opt => [1, 2].includes(opt.type)).map(option => option.name.toUcFirst());
      return {
        name: (CommandType[String(command.CommandType)] || "?") + " " + [command.name, ...(command.aliases || [])].map(n => n?.toUcFirst()).join(', '),
        value: command.description + '\n\nSyntax : `' + command.syntax + '`\n' + (subcommands.length > 0 ? "\nSubcommands :\n" + subcommands.join(', ') : '') + '\n\u200b',
      }
    }).chunkOf(20);
  } else if (args.length > 0) {
    let findCommand = null;
    let tempArgs = [...args];
    while (tempArgs[0] && findCommand !== undefined) {
      if (findCommand?.options) {
        findCommand = findCommand.options.filter(opt => [1, 2].includes(opt.type)).find(command => [command.name, ...(command.aliases || [])].includes(tempArgs[0]));
      } else {
        findCommand = PermitedCommands.find(command => [command.name, ...(command.aliases || [])].includes(tempArgs[0]));
      }
      tempArgs.shift();
    }

    if (!findCommand) return null;

    pages = [
      { name: (CommandType[String(findCommand.CommandType)] || "?") + " " + [findCommand.name, ...(findCommand.aliases || [])].map(n => n.toUcFirst()).join(', '), value: findCommand.description + '\nSyntax : `' + findCommand.syntax + '`\n\u200b' },
      ...(findCommand.options || []).filter(opt => [1, 2].includes(opt.type)).map(command => ({ name: (CommandType[String(findCommand.CommandType)] || "?") + " " + [command.name, ...(command.aliases || [])].map(n => n.toUcFirst()).join(', '), value: command.description })),
    ].chunkOf(20);
  } else {
    let categories = PermitedCommands.map(cmd => cmd.category).unique().chunkOf(20);
    pages = categories.map(c => c.map(category => {
      let commands = PermitedCommands.filter(cmd => cmd.category === category).map(cmd => cmd.name);
      return { name: (category || 'none')?.toUcFirst(), value: commands.join(', ') };
    }));
  }

  if (DEBUGHELP) {
    while (pages.length < 20) {
      pages.push([{ name: `PAGE N°${pages.length + 1}`, value: 'Ceci est une commande fictive afin d\'observer le système de multipage.' }]);
    }
  }

  return pages;
}

async function GetInput({ interaction, title = "Modal", placeholder = "TEXT_HERE", label = "INPUT_NAME", type = String, default: default_value }) {
  const uid = interaction.id;
  const modalId = `${uid}:modal`;
  const inputId = `${uid}:modal-input`;

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
    let response = await interaction.awaitModalSubmit({ filter: (i) => i.customId === modalId, time: 60_000 });
    await response.deferUpdate();
    return type(response.fields.getTextInputValue(inputId));
  } catch (error) {
    return default_value;
  }
}

function GetHelpButtons({ uid, page, pageSize, pageSpeed, LangToUse }) {
  const EmojiLeft = [Emotes.chevron.black.left.simple, Emotes.chevron.black.left.double, Emotes.chevron.black.left.triple];
  const EmojiRight = [Emotes.chevron.black.right.simple, Emotes.chevron.black.right.double, Emotes.chevron.black.right.triple];

  const ROWS = [
    {
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, customId: `${uid}:help-page-left`, style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(EmojiLeft[pageSpeed || 0]), disabled: page === 0 },
        { type: ComponentType.Button, customId: `${uid}:help-page-speed-down`, style: ButtonStyle.Secondary, emoji: { name: '➖' }, disabled: (pageSpeed || 0) < 1 },
        { type: ComponentType.Button, customId: `${uid}:help-page-goto`, style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(Emotes.compass.black) },
        { type: ComponentType.Button, customId: `${uid}:help-page-speed-up`, style: ButtonStyle.Secondary, emoji: { name: '➕' }, disabled: (pageSpeed || 0) > 1 },
        { type: ComponentType.Button, customId: `${uid}:help-page-right`, style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(EmojiRight[pageSpeed || 0]), disabled: page >= pageSize - 1 },
      ]
    },
    {
      type: ComponentType.ActionRow,
      components: [
        { type: ComponentType.Button, customId: `${uid}:help-new-search`, label: Locale.get("command.help.button.new_search"), style: ButtonStyle.Secondary },
        { type: ComponentType.Button, customId: `${uid}:help-button-close`, label: Locale.get("command.help.button.close"), style: ButtonStyle.Secondary, emoji: { name: '🔒' } },
      ]
    },
  ];

  if (pageSize === 1) ROWS.shift();
  return ROWS;
}