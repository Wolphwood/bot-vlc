import { ApplicationCommandType, ComponentType, ButtonStyle } from "discord.js";
// import { BotError } from "#modules/Errors";
import { noop, Wait, ModalForm, DiscordMenu } from "#modules/Utils";
import Locales from "#modules/Locales";
import Emotes from "#modules/Emotes";
import { PERMISSION } from "#constants";

const BotError = Error;

let CONFIG_MENU_OPEN = [];

export default {
  name: "config",
  userPermission: PERMISSION.GUILD_ADMIN,
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [],
  },

  run: async ({ client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
    let discordElement = message ?? interaction;
    let { member } = discordElement;

    if (!GuildData) {
      let msg = await discordElement.reply({ content: Locales.get("command.config.error.noguilddata"), ephemeral: true });
      await Wait(5000).then(() => msg.delete().catch(noop));
      return;
    }

    if (CONFIG_MENU_OPEN.includes(member.id)) {
      let mentions = CONFIG_MENU_OPEN.map(id => discordElement.guild.members.resolve(id)?.user.username || id).join(', ');

      if (message) {
        let msg = await discordElement.reply({ content: Locales.get("command.config.error.open", mentions), ephemeral: true });
        await Wait(5000).then(() => msg.delete().catch(noop));
      }
      if (interaction) {
        await interaction.reply({ content: Locales.get("command.config.error.open", mentions), ephemeral: true });
      }
      return;
    }

    CONFIG_MENU_OPEN.push(member.id);
    try {
      await OpenConfigMenu({ client, discordElement, GuildData, UserData, LangToUse, userPermissionLevel });
    } finally {
      CONFIG_MENU_OPEN = CONFIG_MENU_OPEN.filter(id => id !== member.id);
    }
  },

  description: Locales.get(`commandinfo.config.description`) || 'No description',
  syntax: Locales.get(`commandinfo.config.syntax`) || 'config',
};

async function OpenConfigMenu({ client, discordElement, GuildData, UserData, LangToUse, userPermissionLevel }) {
  let { member } = discordElement;

  let menu = new DiscordMenu({
    element: discordElement,
    data: {
      selectedCommand: null,
      commands: {
        navSpeed: 0,
        speeds: [1, 5, 10],
        pageIndex: 0,
      }
    },
    pages: [
      {
        name: "home",
        embeds: [{
          thumbnail: {
            url: discordElement.guild.iconURL({ size: 512, extension: "png" }),
          },
          title: "Config menu home",
          description: "description",
          fields: [
            { name: "• " + Locales.get("command.config.button.commands"), value: "Options liées aux commandes." },
            { name: "• " + Locales.get("command.config.button.server"), value: "Daily, Points, Lang, Staff" },
          ],
          color: 0x5865F2,
          footer: {
            text: Locales.get("generic.embed.footer", [client.user.username, client.config.version, (member.nickname ?? member.user.username)])
          },
          timestamp: new Date(),
        }],
        components: [
          function({ pages }) {
            return [
              { style: ButtonStyle.Primary, label: Locales.get("command.config.button.commands"), action: 'goto:' + pages.findIndex(p => p.name === "commands") },
              { style: ButtonStyle.Primary, label: Locales.get("command.config.button.server"), action: 'goto:' + pages.findIndex(p => p.name === "guild") },
            ]
          },
          [
            { style: ButtonStyle.Danger, label: Locales.get("command.config.button.close"), action: 'stop' },
          ],
        ]
      },
      {
        name: "commands",
        embeds: function() {
          if (this.data.selectedCommand !== null) {
            let cmdIndex = GuildData.commands.findIndex(cmd => cmd.name === this.data.selectedCommand.slice(1));
            let command = GuildData.commands[cmdIndex] ?? {
              name: this.data.selectedCommand.slice(1),
              cooldown: null,
              ban: [],
              channelConfig: {
                mode: client.CONSTANT.CHANNEL_CONFIG.BLACKLIST,
                whitelist: [], blacklist: [],
              }
            };

            let langKey = command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST
              ? 'blacklist'
              : command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.WHITELIST
                ? 'whitelist'
                : 'unknow';

            return [{
              title: Locales.get("command.config.command.embed.title", [this.data.selectedCommand.ucFirst()]),
              fields: [
                { name: Locales.get("command.config.command.embed.field.cooldown.name"), value: Locales.get("command.config.command.embed.field.cooldown.value", [(command.cooldown ?? 10)]) },
                { name: Locales.get("command.config.command.embed.field.channel." + langKey + ".name"), value: command.channelConfig[langKey]?.map(c => `<#${c}>`).join(' ') || Locales.get("command.config.command.embed.field.channel." + langKey + ".default.value") },
              ],
              color: 0x5865F2,
              footer: {
                text: Locales.get("generic.embed.footer", [client.user.username, client.config.version, (member.nickname ?? member.user.username)])
              },
              timestamp: new Date(),
            }];
          }

          if (this.data.commands.pageIndex === 0) {
            return [{
              title: Locales.get("command.config.commands.embed.title"),
              fields: [
                {
                  name: Locales.get("command.config.commands.embed.field.name"), value: [
                    Locales.get("command.config.commands.embed.chat.field.name", [client.textCommands.size, Emotes.command_icon.chat.white]),
                    Locales.get("command.config.commands.embed.slash.field.name", [client.slashCommands.size, Emotes.command_icon.slash.white]),
                    Locales.get("command.config.commands.embed.hybrid.field.name", [client.hybridCommands.size, Emotes.command_icon.hybrid.white]),
                  ].join('\n')
                },
              ],
              color: 0x5865F2,
              footer: {
                text: Locales.get("generic.embed.footer", [client.user.username, client.config.version, (member.nickname ?? member.user.username)])
              },
              timestamp: new Date(),
            }];
          }

          let commands = [
            ...client.commands.map(command => ({
              name: Emotes.command_icon.chat.white + ' ' + command.name + (command.aliases?.length ? ` _(${command.aliases.join(', ')})_` : ''),
              value: command.description, userPermission: command.userPermission
            })),
            ...client.slashCommands.map(command => ({
              name: Emotes.command_icon.slash.white + ' ' + command.name,
              value: command.description, userPermission: command.userPermission
            })),
            ...client.hybridCommands.map(command => ({
              name: Emotes.command_icon.hybrid.white + ' ' + command.name + (command.aliases?.length ? ` _(${command.aliases.join(', ')})_` : ''),
              value: command.description, userPermission: command.userPermission
            })),
          ].filter(command => userPermissionLevel >= command.userPermission).chunkOf(25);

          return [{
            title: Locales.get("command.config.commands.embed.title"),
            description: Locales.get("command.config.commands.embed.description"),
            fields: commands[this.data.commands.pageIndex - 1],
            color: 0x5865F2,
            footer: {
              text: Locales.get("generic.embed.footer.page", [client.user.username, client.config.version, this.data.commands.navSpeed, this.data.commands.pageIndex, commands.length])
            },
            timestamp: new Date(),
          }];
        },
        components: [
          async function({ pages }) {
            if (this.data.selectedCommand !== null) {
              let cmdIndex = GuildData.commands.findIndex(cmd => cmd.name === this.data.selectedCommand.slice(1));
              if (cmdIndex === -1) {
                GuildData.commands.push({
                  name: this.data.selectedCommand.slice(1),
                  cooldown: null,
                  ban: [],
                  channelConfig: {
                    mode: client.CONSTANT.CHANNEL_CONFIG.BLACKLIST,
                    whitelist: [], blacklist: [],
                  }
                });
                cmdIndex = GuildData.commands.length - 1;
                await GuildData.save();
              }

              let command = GuildData.commands[cmdIndex];
              let langKey = command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST ? 'blacklist' : 'whitelist';

              return [
                [
                  {
                    label: Locales.get("command.config.command.button.cooldown"),
                    action: async (interaction) => {
                      let modal = new ModalForm({ title: Locales.get("command.config.commands.embed.title"), translate: true, LangToUse })
                        .addRow().addTextField({ name: 'value', label: "command.config.guild.daily.modal.text.label", placeholder: "command.config.guild.daily.modal.text.placeholder" });

                      let result = await modal.setInteraction(interaction).popup();
                      if (isNaN(result.get('value'))) return interaction.channel.send({ content: Locales.get("generic.error.number.invalid") }).then(msg => Wait(5000).then(() => msg.delete().catch(noop)));

                      GuildData.commands[cmdIndex].cooldown = Number(result.get('value')) < 0 ? null : Number(result.get('value'));
                      await GuildData.save();
                    }
                  },
                  {
                    label: Locales.get("command.config.command.button.channel." + (command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST ? 'blacklist' : 'whitelist')),
                    style: command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST ? ButtonStyle.Danger : ButtonStyle.Success,
                    action: async () => {
                      command.channelConfig.mode = command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST ? client.CONSTANT.CHANNEL_CONFIG.WHITELIST : client.CONSTANT.CHANNEL_CONFIG.BLACKLIST;
                      await GuildData.save();
                    }
                  },
                ],
                [
                  {
                    label: Locales.get("command.config.command.button.channel.add." + langKey),
                    action: async (interaction) => {
                      await interaction.reply({ content: Locales.get("generic.input.mention.channel") });
                      let messages = await interaction.channel.awaitMessages({
                        filter: (m) => m.author.id === interaction.member.id && (m.mentions.channels.size > 0 || m.content?.simplify().toLowerCase() == ".cancel"),
                        max: 1, idle: 300_000
                      }).catch(() => null);

                      await interaction.deleteReply().catch(noop);
                      if (!messages || messages.size < 1 || messages.first().content?.simplify().toLowerCase() == ".cancel") return;

                      messages.first().delete().catch(noop);
                      messages.first().mentions.channels.forEach(channel => GuildData.commands[cmdIndex].channelConfig[langKey].addToSet(channel.id));
                      await GuildData.save();
                    }
                  },
                  {
                    label: Locales.get("command.config.command.button.channel.remove." + langKey),
                    action: async (interaction) => {
                      await interaction.reply({ content: Locales.get("generic.input.mention.channel") });
                      let messages = await interaction.channel.awaitMessages({
                        filter: (m) => m.author.id === interaction.member.id && (m.mentions.channels.size > 0 || m.content?.simplify().toLowerCase() == ".cancel"),
                        max: 1, idle: 300_000
                      }).catch(() => null);

                      await interaction.deleteReply().catch(noop);
                      if (!messages || messages.size < 1 || messages.first().content?.simplify().toLowerCase() == ".cancel") return;

                      messages.first().delete().catch(noop);
                      let ids = messages.first().mentions.channels.map(c => c.id);
                      GuildData.commands[cmdIndex].channelConfig[langKey] = GuildData.commands[cmdIndex].channelConfig[langKey].filter(id => !ids.includes(id));
                      await GuildData.save();
                    }
                  },
                ]
              ]
            }

            if (this.data.commands.pageIndex === 0) {
              return [{ emoji: '🧭', label: Locales.get("command.config.commands.button.find"), action: function() { this.data.commands.pageIndex = 1; } }]
            }

            let commands = [
              ...client.commands.map(cmd => ({ emote: Emotes.command_icon.chat.white, name: cmd.name, value: '>' + cmd.name, userPermission: cmd.userPermission })),
              ...client.slashCommands.map(cmd => ({ emote: Emotes.command_icon.slash.white, name: cmd.name, value: '/' + cmd.name, userPermission: cmd.userPermission })),
              ...client.hybridCommands.map(cmd => ({ emote: Emotes.command_icon.hybrid.white, name: cmd.name, value: '&' + cmd.name, userPermission: cmd.userPermission })),
            ].filter(cmd => userPermissionLevel >= cmd.userPermission).chunkOf(25);

            return [
              [
                { style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple), disabled: this.data.commands.pageIndex === 1, action: function() { this.data.commands.pageIndex--; } },
                { style: ButtonStyle.Secondary, emoji: { name: '➖' }, action: noop },
                { style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(Emotes.compass.black), action: noop },
                { style: ButtonStyle.Secondary, emoji: { name: '➕' }, action: noop },
                { style: ButtonStyle.Secondary, emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple), disabled: this.data.commands.pageIndex === commands.length, action: function() { this.data.commands.pageIndex++; } },
              ],
              [{
                type: ComponentType.StringSelect,
                placeholder: Locales.get("command.config.command.select.placeholder"),
                options: commands[this.data.commands.pageIndex - 1].map(cmd => ({ emoji: cmd.emote, label: cmd.name, value: cmd.value })),
                action: function({ interaction }) { this.data.selectedCommand = interaction.values[0]; },
              }],
            ];
          },
          function({ pages }) {
            return [
              { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple), label: Locales.get("command.config.button.back"), action: function() { this.data.selectedCommand = null; this.data.commands.pageIndex = 0; } },
              { emoji: '🏠', label: Locales.get("command.config.button.home"), action: function() { this.data.selectedCommand = null; this.page = pages.findIndex(p => p.name === "home"); } },
            ]
          },
        ],
      },
      {
        name: "guild",
        components: [
          function({ pages }) {
            return [{ style: ButtonStyle.Primary, label: Locales.get("command.config.guild.button.staff"), action: 'goto:' + pages.findIndex(p => p.name === "config-staff") }]
          },
          function({ pages }) {
            return [{ emoji: '🏠', label: Locales.get("command.config.button.home"), action: 'goto:' + pages.findIndex(p => p.name === "home") }]
          },
        ],
        embeds: async function() {
          return [{
            title: Locales.get("command.config.guild.embed.title"),
            fields: [{ name: Locales.get("command.config.guild.embed.field.lang.name"), value: Locales.get("command.config.guild.embed.field.lang.value", [GuildData?.lang]) }],
            color: 0x5865F2,
            footer: { text: Locales.get("generic.embed.footer", [client.user.username, client.config.version, (member.nickname ?? member.user.username)]) },
            timestamp: new Date(),
          }];
        },
      },
      {
        name: "config-staff",
        components: [
          function() {
            return [
              { emoji: "➕", label: Locales.get("command.config.guild.staff.button.administrator"), action: async (i) => editStaff({ GuildData, interaction: i, mode: "add", accessLevel: "admin" }) },
              { emoji: "➖", label: Locales.get("command.config.guild.staff.button.administrator"), action: async (i) => editStaff({ GuildData, interaction: i, mode: "rem", accessLevel: "admin" }) },
            ]
          },
          function() {
            return [
              { emoji: "➕", label: Locales.get("command.config.guild.staff.button.moderator"), action: async (i) => editStaff({ GuildData, interaction: i, mode: "add", accessLevel: "mod" }) },
              { emoji: "➖", label: Locales.get("command.config.guild.staff.button.moderator"), action: async (i) => editStaff({ GuildData, interaction: i, mode: "rem", accessLevel: "mod" }) },
            ]
          },
          function({ pages }) {
            return [
              { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple), label: Locales.get("command.config.button.back"), action: 'goto:' + pages.findIndex(p => p.name === "guild") },
              { emoji: '🏠', label: Locales.get("command.config.button.home"), action: 'goto:' + pages.findIndex(p => p.name === "home") },
            ]
          },
        ],
        embeds: async function() {
          return [{
            title: "Configuration des permissions du Staff",
            fields: [
              { name: Locales.get("command.config.guild.staff.embed.field.administrator.user.name"), value: GuildData.administrators.filter(a => a.type === "user").map(a => `<@${a.id}>`).join('\n') || Locales.get("command.config.guild.staff.embed.field.administrator.default.value"), inline: true },
              { name: Locales.get("command.config.guild.staff.embed.field.administrator.role.name"), value: GuildData.administrators.filter(a => a.type === "role").map(a => `<@&${a.id}>`).join('\n') || Locales.get("command.config.guild.staff.embed.field.administrator.default.value"), inline: true },
              { name: '\u200b', value: '\u200b', inline: false },
              { name: Locales.get("command.config.guild.staff.embed.field.moderator.user.name"), value: GuildData.moderators.filter(m => m.type === "user").map(m => `<@${m.id}>`).join('\n') || Locales.get("command.config.guild.staff.embed.field.moderator.default.value"), inline: true },
              { name: Locales.get("command.config.guild.staff.embed.field.moderator.role.name"), value: GuildData.moderators.filter(m => m.type === "role").map(m => `<@&${m.id}>`).join('\n') || Locales.get("command.config.guild.staff.embed.field.moderator.default.value"), inline: true },
            ],
            color: 0x5865F2,
            footer: { text: Locales.get("generic.embed.footer", [client.user.username, client.config.version, (member.nickname ?? member.user.username)]) },
            timestamp: new Date(),
          }];
        },
      },
    ]
  });

  await menu.send();
  await menu.handle();
}

async function editStaff({ GuildData, interaction, mode, accessLevel }) {
  let key = accessLevel === 'admin' ? 'administrators' : accessLevel === 'mod' ? 'moderators' : null;
  if (!key) throw new BotError("WrongValue", "accessLevel", ["admin", "mod"]);

  await interaction.reply({ content: Locales.get("generic.input.mention.mention") });
  let messages = await interaction.channel.awaitMessages({
    filter: (m) => m.author.id === interaction.member.id && (m.mentions.roles.size > 0 || m.mentions.users.size > 0 || m.content?.simplify().toLowerCase() == ".cancel"),
    max: 1, idle: 300_000
  }).catch(() => null);

  await interaction.deleteReply().catch(noop);
  if (!messages || messages.size < 1 || messages.first().content?.simplify().toLowerCase() == ".cancel") return;

  messages.first().delete().catch(noop);
  let mentions = [];
  messages.first().mentions.users.forEach(u => mentions.push({ type: "user", id: u.id }));
  messages.first().mentions.roles.forEach(r => mentions.push({ type: "role", id: r.id }));

  if (mode === "add") {
    mentions.forEach(m => GuildData[key].addToSet(m));
  } else {
    mentions.forEach(m => {
      GuildData[key] = GuildData[key].filter(exist => exist.id !== m.id);
    });
  }

  await GuildData.save();
  return GuildData;
}