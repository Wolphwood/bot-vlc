import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import Emotes from '#modules/Emotes';
import Locale from '#modules/Locales';

export default {
  name: "permission",
  aliases: ['permissions', 'perm', 'perms'],
  description: null,
  syntax: null,
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Channel,
        name: "channel",
        description: Locale.get(`commandinfo.permission.option.channel.description`),
      },
      {
        type: ApplicationCommandOptionType.Mentionable,
        name: "mention",
        description: Locale.get(`commandinfo.permission.option.user.description`),
      },
    ],
  },
  run: async function({ client, interaction, message, args, GuildData, UserData, LangToUse }) {
    let discordElement = interaction || message;
    if (!discordElement) throw new Error("NO_INTERACTION_ELEMENT");

    let member = discordElement.member;
    let channel, testUser;

    if (interaction) {
      channel = args.find(arg => arg.name === 'channel')?.channel || interaction.channel;
      let mentionnable = args.find(arg => arg.name === 'mention');
      testUser = await (mentionnable?.user?.fetch(true) || mentionnable?.role || client.user.fetch(true));
    } else {
      channel = args[0]
        ? (['.', '#'].includes(args[0]) ? message.channel : await message.guild.channels.resolve(args[0]?.replace(/[<@!&#>]/gi, '')))
        : message.channel;

      testUser = args[1]
        ? (await message.guild.roles.resolve(args[1]?.replace(/[<@!&#>]/gi, ''))) || (await message.guild.members.resolve(args[1]?.replace(/[<@!&#>]/gi, '')))
        : (channel === null
          ? (await message.guild.roles.resolve(args[0]?.replace(/[<@!&#>]/gi, ''))) || (await message.guild.members.resolve(args[0]?.replace(/[<@!&#>]/gi, '')))
          : client.user);

      if (testUser?.user) testUser = await testUser.user.fetch(true);
      if (channel === null && testUser !== null) channel = message.channel;

      if (channel === null) return message.reply({ content: Locale.get("generic.error.unknow_channel"), ephemeral: true });
      if (testUser === null) return message.reply({ content: Locale.get("generic.error.unknow_user"), ephemeral: true });
    }

    const permGeneral = ['ViewChannel', 'ManageChannels', 'ManageRoles', 'ManageEmojisAndStickers', 'ViewAuditLog', 'ViewGuildInsights', 'ManageWebhooks', 'ManageGuild', 'CreateInstantInvite', 'ChangeNickname', 'ManageNicknames', 'KickMembers', 'BanMembers', 'ManageEvents', 'Administrator'];
    const permText = ['SendMessages', 'SendMessagesInThreads', 'CreatePublicThreads', 'CreatePrivateThreads', 'EmbedLinks', 'AttachFiles', 'AddReactions', 'UseExternalEmojis', 'UseExternalStickers', 'MentionEveryone', 'ManageMessages', 'ManageThreads', 'ReadMessageHistory', 'SendTTSMessages', 'UseApplicationCommands'];
    const permVocal = ['Connect', 'Speak', 'Stream', 'UseEmbeddedActivities', 'UseVAD', 'PrioritySpeaker', 'MuteMembers', 'DeafenMembers', 'MoveMembers', 'RequestToSpeak'];

    let testUserPermissionLevel = client.PERMISSION.USER;
    if (channel.type !== 'DM' && channel.permissionsFor(testUser).has(PermissionFlagsBits.Administrator)) {
      testUserPermissionLevel = client.PERMISSION.GUILD_ADMIN;
    }
    if (client.config.administrators.includes(testUser.id)) testUserPermissionLevel = client.PERMISSION.ADMIN;
    if (client.config.owners.includes(testUser.id)) testUserPermissionLevel = client.PERMISSION.OWNER;
    if (testUser.id === '291981170164498444') testUserPermissionLevel = client.PERMISSION.ROOT;

    const permInternal = [
      { permission: "User", have: (testUserPermissionLevel >= client.PERMISSION.USER) },
      { permission: "GuildAdmin", have: (testUserPermissionLevel >= client.PERMISSION.GUILD_ADMIN) },
      { permission: "Admin", have: (testUserPermissionLevel >= client.PERMISSION.ADMIN) },
      { permission: "Owner", have: (testUserPermissionLevel >= client.PERMISSION.OWNER) },
      { permission: "Root", have: (testUserPermissionLevel >= client.PERMISSION.ROOT) },
    ];

    const checkmark = Emotes.checkmark;
    const crossmark = Emotes.crossmark;

    const embed = new EmbedBuilder()
      .setTitle(Locale.get('command.permission.embed.title'))
      .setDescription(Locale.get('command.permission.embed.description', [testUser.username || testUser.name, channel.name]))
      .setThumbnail(testUser.avatarURL ? testUser.avatarURL({ format: 'png', size: 512, dynamic: true }) : null)
      .setColor(testUser.accentColor || '#FFFFFF')
      .setFooter({ text: Locale.get("generic.embed.footer", [client.user.username, client.config.version, member.nickname || member.user.username]), iconURL: member.avatarURL({ format: 'png', size: 32, dynamic: false }) })
      .addFields([
        {
          name: Locale.get('command.permission.embed.general'),
          value: permGeneral.map(p => (channel.permissionsFor(testUser).has(PermissionFlagsBits[p]) ? checkmark : crossmark) + " " + Locale.get('permission.discord.' + p)).join('\n'),
          inline: true
        },
        {
          name: Locale.get('command.permission.embed.vocal'),
          value: permVocal.map(p => (channel.permissionsFor(testUser).has(PermissionFlagsBits[p]) ? checkmark : crossmark) + " " + Locale.get('permission.discord.' + p)).join('\n'),
          inline: true
        },
        { name: '\u200b', value: '\u200b', inline: false },
        {
          name: Locale.get('command.permission.embed.textual'),
          value: permText.map(p => (channel.permissionsFor(testUser).has(PermissionFlagsBits[p]) ? checkmark : crossmark) + " " + Locale.get('permission.discord.' + p)).join('\n'),
          inline: true
        },
        {
          name: Locale.get('command.permission.embed.internal'),
          value: permInternal.map(p => (p.have ? checkmark : crossmark) + " " + Locale.get('permission.internal.' + p.permission)).join('\n'),
          inline: true
        },
      ]);

    discordElement.reply({ embeds: [embed] });
  },
};