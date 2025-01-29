const { ApplicationCommandType, ComponentType, ButtonStyle, EmbedBuilder, TextInputStyle, Guild, ThreadManager, Utils } = require("discord.js");
const client = require("../../app");
const { BotError } = require("../../modules/Errors");

let CONFIG_MENU_OPEN = [];

module.exports = {
    name: "config",
    userPermission: client.PERMISSION.GUILD_ADMIN,
    type: ApplicationCommandType.ChatInput,
    options: [],
    run: async ({client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
        let discordElement = message ?? interaction;
        let { member } = discordElement;

        if (CONFIG_MENU_OPEN.includes(member.id)) {
            let mentions = CONFIG_MENU_OPEN.map(m => message.guild.members.resolve(message.author.id)?.user.username).join(', ');

            if (message) {
                let msg = await discordElement.reply({ "content": Locale.get("command.config.error.open", mentions), ephemeral: true });
                setTimeout(() => msg.delete(), 5*1000);
            }
            if (interaction) {
                let msg = await interaction.channel.send({ "content": Locale.get("command.config.error.open", mentions), ephemeral: true });
            }
        }

        CONFIG_MENU_OPEN.push(member.id);
        await OpenConfigMenu({ discordElement, GuildData, UserData, LangToUse, userPermissionLevel });
        CONFIG_MENU_OPEN = CONFIG_MENU_OPEN.filter(id => id !== member.id);
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;



async function OpenConfigMenu({ discordElement, GuildData, UserData, LangToUse, userPermissionLevel }) {
    let { member } = discordElement;

    let menu = new DiscordMenu({
        element: discordElement,
        data: {
            selectedCommand: null,
            commands: {
                navSpeed: 0,
                speeds: [1,5,10],
                pageIndex: 0,
            }
        },
        pages: [
            {
                name: "home",
                embeds : [{
                    thumbnail: {
                        url: discordElement.guild.iconURL({ size: 512, extension: "png" }),
                    },
                    title: "Config menu home",
                    description: "description",
                    fields: [
                        { name: "• "+ Locale.get("command.config.button.commands"), value: "Options liées aux commandes." },
                        { name: "• "+ Locale.get("command.config.button.server"), value: "Daily, Points, Lang, Staff" },
                    ],
                    color: 0x5865F2,
                    footer: {
                        text: Locale.get("generic.embed.footer", [ client.user.username, client.config.version, (member.nickname ?? member.user.username) ])
                    },
                    timestamp: new Date(),
                }],
                components: [
                    function({ pages }) {
                        return [
                            { style: ButtonStyle.Primary, label: Locale.get("command.config.button.commands"), action: 'goto:'+pages.findIndex(p => p.name === "commands") },
                            { style: ButtonStyle.Primary, label: Locale.get("command.config.button.server"), action: 'goto:'+pages.findIndex(p => p.name === "guild") },
                        ]
                    },
                    [
                        { style: ButtonStyle.Danger, label: Locale.get("command.config.button.close"), action: 'stop' },
                    ],
                ]
            },
            {
                name: "commands",
                embeds : function() {
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
                                : 'unknow'
                        ;

                        return [{
                            title: Locale.get("command.config.command.embed.title", [this.data.selectedCommand.ucFirst()]),
                            fields: [
                                { name: Locale.get("command.config.command.embed.field.cooldown.name"), value: Locale.get("command.config.command.embed.field.cooldown.value", [ (command.cooldown ?? module.exports.cooldown ?? 10) ]) },
                                { name: Locale.get("command.config.command.embed.field.channel."+langKey+".name"), value: command.channelConfig[langKey]?.map(c => `<#${c}>`).join(' ') || Locale.get("command.config.command.embed.field.channel."+langKey+".default.value") },
                            ],
                            color: 0x5865F2,
                            footer: {
                                text: Locale.get("generic.embed.footer", [ client.user.username, client.config.version, (member.nickname ?? member.user.username) ])
                            },
                            timestamp: new Date(),
                        }];
                    }

                    if (this.data.commands.pageIndex === 0) {
                        return [{
                            title: Locale.get("command.config.commands.embed.title"),
                            fields: [ 
                                { name: Locale.get("command.config.commands.embed.field.name"), value: [
                                    Locale.get("command.config.commands.embed.chat.field.name", [client.commands.length, Emotes.command_icon.chat.white]),
                                    Locale.get("command.config.commands.embed.slash.field.name", [client.slashCommands.length, Emotes.command_icon.slash.white]),
                                    Locale.get("command.config.commands.embed.hybrid.field.name", [client.hybridCommands.length, Emotes.command_icon.hybrid.white]),
                                ].join('\n') },
                            ],
                            color: 0x5865F2,
                            footer: {
                                text: Locale.get("generic.embed.footer", [ client.user.username, client.config.version, (member.nickname ?? member.user.username) ])
                            },
                            timestamp: new Date(),
                        }];
                    }

                    let commands = [
                        ...client.commands.map(command => Object({
                            name: Emotes.command_icon.chat.white +' '+ command.name + (
                                command.aliases?.length
                                ? ` _(${command.aliases.join(', ')})_` :
                                ''
                            ),
                            value: command.description, userPermission: command.userPermission
                        })),
                        ...client.slashCommands.map(command => Object({
                            name: Emotes.command_icon.slash.white +' '+ command.name,
                            value: command.description, userPermission: command.userPermission
                        })),
                        ...client.hybridCommands.map(command => Object({
                            name: Emotes.command_icon.hybrid.white +' '+ command.name + ( command.aliases?.length ? ` _(${command.aliases.join(', ')})_` : '' ),
                            value: command.description, userPermission: command.userPermission
                        })),
                    ].filter(command => userPermissionLevel >= command.userPermission).chunkOf(25);

                    return [{
                        title: Locale.get("command.config.commands.embed.title"),
                        description: Locale.get("command.config.commands.embed.description"),
                        fields: commands[ this.data.commands.pageIndex - 1 ],
                        color: 0x5865F2,
                        footer: {
                            text: Locale.get("generic.embed.footer.page", [client.user.username, client.config.version, this.data.commands.navSpeed, this.data.commands.pageIndex, commands.length])
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

                            let langKey = command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST
                                ? 'blacklist'
                                : command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.WHITELIST
                                    ? 'whitelist'
                                    : 'unknow'
                            ;

                            async function SwitchChannelMode() {
                                command.channelConfig.mode = command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST
                                    ? client.CONSTANT.CHANNEL_CONFIG.WHITELIST
                                    : client.CONSTANT.CHANNEL_CONFIG.BLACKLIST
                                ;
                                GuildData.commands[cmdIndex] = command;
                                await GuildData.save();
                            };

                            async function AddChannelInList(interaction) {
                                await interaction.reply({ content: Locale.get("generic.input.mention.channel") });
                                let messages = await interaction.channel.awaitMessages({ filter: (m) => {
                                    if (m.author.id === interaction.member.id && (m.mentions.channels.size > 0)) {
                                        m.delete().catch(() => {});
                                        return true;
                                    }
                                    return false;
                                }, max: 1, idle: 5*60_000, errors: ['time'] });
                                await interaction.deleteReply(); // delete reply
                                if (messages.size < 1) return; // // If no replied roles, do nothing

                                messages.first().mentions.channels.forEach(channel => {
                                    GuildData.commands[cmdIndex].channelConfig[langKey].addToSet(channel.id);
                                });

                                await GuildData.save();
                            }

                            async function RemoveChannelInList(interaction) {
                                await interaction.reply({ content: Locale.get("generic.input.mention.channel") });
                                let messages = await interaction.channel.awaitMessages({ filter: (m) => {
                                    if (m.author.id === interaction.member.id && (m.mentions.channels.size > 0)) {
                                        m.delete().catch(() => {});
                                        return true;
                                    }
                                    return false;
                                }, max: 1, idle: 5*60_000, errors: ['time'] });
                                await interaction.deleteReply(); // delete reply
                                if (messages.size < 1) return; // // If no replied roles, do nothing

                                let mentionnedChannels = messages.first().mentions.channels.array().map(channel => channel.id);
                                GuildData.commands[cmdIndex].channelConfig[langKey] = GuildData.commands[cmdIndex].channelConfig[langKey].filter(chnl => !mentionnedChannels.includes(chnl));

                                await GuildData.save();
                            }

                            async function EditCooldown(interaction) {
                                let modal = new ModalForm({ title: Locale.get("command.config.commands.embed.title"), translate: true, LangToUse })
                                    .addRow().addTextField({ name: 'value', label: "command.config.guild.daily.modal.text.label", placeholder: "command.config.guild.daily.modal.text.placeholder" })
                                ;

                                let result = await modal.setInteraction(interaction).popup();

                                if (isNaN(result.get('value'))) return interaction.channel.send({ content: Locale.get("generic.error.number.invalid") }).then(msg => setTimeout(() => msg.delete(), 5_000));

                                if (Number(result.get('value')) < 0) {
                                    GuildData.commands[cmdIndex].cooldown = null;
                                } else {
                                    GuildData.commands[cmdIndex].cooldown = Number(result.get('value'));
                                }

                                await GuildData.save();
                            }

                            return [
                                [
                                    { label: Locale.get("command.config.command.button.cooldown"), action: EditCooldown },
                                    command.channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST
                                        ? { label: Locale.get("command.config.command.button.channel.blacklist"), style: ButtonStyle.Danger, action: SwitchChannelMode }
                                        : { label: Locale.get("command.config.command.button.channel.whitelist"), style: ButtonStyle.Success, action: SwitchChannelMode }
                                    ,
                                ],
                                [
                                    { label: Locale.get("command.config.command.button.channel.add."+langKey), action: AddChannelInList },
                                    { label: Locale.get("command.config.command.button.channel.remove."+langKey), action: RemoveChannelInList },
                                ]
                            ]
                        }

                        if (this.data.commands.pageIndex === 0) {
                            return [
                                { emoji: '🧭', label: Locale.get("command.config.commands.button.find"), action: function(){ this.data.commands.pageIndex = 1; } },
                            ]
                        }


                        let commands = [
                            ...client.commands.map(command => Object({ emote: Emotes.command_icon.chat.white, name: command.name, value: '>'+command.name, userPermission: command.userPermission })),
                            ...client.slashCommands.map(command => Object({ emote: Emotes.command_icon.slash.white, name: command.name, value: '/'+command.name, userPermission: command.userPermission })),
                            ...client.hybridCommands.map(command => Object({ emote: Emotes.command_icon.hybrid.white, name: command.name, value: '&'+command.name, userPermission: command.userPermission })),
                        ].filter(command => userPermissionLevel >= command.userPermission).chunkOf(25);

                        
                        const buttonEmotes = {
                            left: [ Emotes.chevron.black.left.simple, Emotes.chevron.black.left.double, Emotes.chevron.black.left.triple ],
                            right: [ Emotes.chevron.black.right.simple, Emotes.chevron.black.right.double, Emotes.chevron.black.right.triple ],
                        };

                        let components = [
                            [
                                {
                                    style: ButtonStyle.Secondary,
                                    emoji: Emotes.GetEmojiObject(buttonEmotes['left'][this.data.commands.navSpeed]),
                                    disabled: (this.data.commands.pageIndex === 0 || commands.length < 10)
                                },
                                {
                                    style: ButtonStyle.Secondary,
                                    emoji: {name: '➖'},
                                    disabled: (this.data.commands.navSpeed < 1),
                                    action: function(){}
                                },
                                {
                                    style: ButtonStyle.Secondary,
                                    emoji: Emotes.GetEmojiObject(Emotes.compass.black),
                                    action: function(){}
                                },
                                {
                                    style: ButtonStyle.Secondary,
                                    emoji: {name: '➕'},
                                    disabled: (this.data.commands.navSpeed > 1),
                                    action: function(){}
                                },
                                {
                                    style: ButtonStyle.Secondary,
                                    emoji: Emotes.GetEmojiObject(buttonEmotes['right'][this.data.commands.navSpeed]),
                                    disabled: (this.data.commands.pageIndex === commands.length-1 || commands.length < 5),
                                    action: function(){}
                                },
                            ],
                            [
                                {
                                    type: ComponentType.StringSelect,
                                    placeholder: Locale.get("command.config.command.select.placeholder"),
                                    options: commands[ this.data.commands.pageIndex - 1 ].map(command => {
                                        return { emoji: command.emote, label: command.name, value: command.value, default: false };
                                    }),
                                    action: function(interaction) {
                                        this.data.selectedCommand = interaction.values[0];
                                    },
                                }
                            ],
                        ];

                        return commands.length === 1 ? components.slice(1) : components;
                    },
                    function({ pages }) {
                        return [
                            { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple), label: Locale.get("command.config.button.back"), action: function() { this.data.selectedCommand = null; this.data.commands.pageIndex = 0; } },
                            { emoji: '🏠', label: Locale.get("command.config.button.home"), action: function() { this.data.selectedCommand = null;this.page = pages.findIndex(p => p.name === "home");} },
                        ]
                    },
                ],
            },
            {
                name: "guild",
                components: [
                    function({ pages }) {
                        return [
                            // { style: ButtonStyle.Primary, label: Locale.get("command.config.guild.button.lang"), action: 'goto:' + pages.findIndex(p => p.name === "lang") },
                            { style: ButtonStyle.Primary, label: Locale.get("command.config.guild.button.staff"), action: 'goto:' + pages.findIndex(p => p.name === "config-staff") },
                        ]
                    },
                    function({ pages }) {
                        return [
                            { emoji: '🏠', label: Locale.get("command.config.button.home"), action: 'goto:' + pages.findIndex(p => p.name === "home") },
                        ]
                    },
                ],
                embeds: async function() {
                    return [{
                        title: Locale.get("command.config.guild.embed.title"),
                        fields: [
                            {
                                name: Locale.get("command.config.guild.embed.field.lang.name"),
                                value: Locale.get("command.config.guild.embed.field.lang.value", [GuildData.lang]),
                            },
                        ],
                        color: 0x5865F2,
                        footer: {
                            text: Locale.get("generic.embed.footer", [ client.user.username, client.config.version, (member.nickname ?? member.user.username) ])
                        },
                        timestamp: new Date(),
                    }];
                },
            },
            // {
            //     name: "lang",
            //     components: [
            //         function({ pages }) {
            //             return [
            //                 { type: ComponentType.StringSelect, placeholder: Locale.get("command.config.guild.lang.select.placeholder"), options: Locale.getLangs().map(lang => ({ label: lang, value: lang })), action: function(interaction) { return defineLang.apply(this, [{ interaction, GuildData, UserData, LangToUse }]) } },
                            
            //             ]
            //         },
            //         function({ pages }) {
            //             return [
            //                 { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple), label: Locale.get("command.config.button.back"), action: 'goto:' + pages.findIndex(p => p.name === "guild") },
            //                 { emoji: '🏠', label: Locale.get("command.config.button.home"), action: 'goto:' + pages.findIndex(p => p.name === "home") },
            //             ]
            //         },
            //     ],
            //     embeds: async function() {
            //         return [{
            //             title: Locale.get("command.config.guild.lang.embed.title"),
            //             description: Locale.get("command.config.guild.lang.embed.description"),
            //             fields: [
            //                 {
            //                     name: Locale.get("command.config.guild.lang.embed.field.name"),
            //                     value: Locale.get("command.config.guild.lang.embed.field.value", [Object.keys(LangList).join('\n')]),
            //                 },
            //             ],
            //             color: 0x5865F2,
            //             footer: {
            //                 text: Locale.get("generic.embed.footer", [ client.user.username, client.config.version, (member.nickname ?? member.user.username) ])
            //             },
            //             timestamp: new Date(),
            //         }];
            //     },
            // },
            {
                name: "config-staff",
                components: [
                    function({ pages }) {
                        return [
                            { emoji: "➕", label: Locale.get("command.config.guild.staff.button.administrator"), action: async function(interaction) { return await editStaff.apply(this, [{ GuildData, UserData, LangToUse, interaction, mode: "add", accessLevel: "admin" }]) } },
                            { emoji: "➖", label: Locale.get("command.config.guild.staff.button.administrator"), action: async function(interaction) { return await editStaff.apply(this, [{ GuildData, UserData, LangToUse, interaction, mode: "rem", accessLevel: "admin" }]) } },
                            
                        ]
                    },
                    function({ pages }) {
                        return [
                            { emoji: "➕", label: Locale.get("command.config.guild.staff.button.moderator"), action: async function(interaction) { return await editStaff.apply(this, [{ GuildData, UserData, LangToUse, interaction, mode: "add", accessLevel: "mod" }]) } },
                            { emoji: "➖", label: Locale.get("command.config.guild.staff.button.moderator"), action: async function(interaction) { return await editStaff.apply(this, [{ GuildData, UserData, LangToUse, interaction, mode: "rem", accessLevel: "mod" }]) } },
                            
                        ]
                    },
                    
                    function({ pages }) {
                        return [
                            { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple), label: Locale.get("command.config.button.back"), action: 'goto:' + pages.findIndex(p => p.name === "guild") },
                            { emoji: '🏠', label: Locale.get("command.config.button.home"), action: 'goto:' + pages.findIndex(p => p.name === "home") },
                        ]
                    },
                ],
                embeds: async function() {
                    return [{
                        title: "Configuration des permissions du Staff",
                        fields: [
                            { name: Locale.get("command.config.guild.staff.embed.field.administrator.user.name"), value: GuildData.administrators.filter(admin => admin.type === "user" ).map(admin => `<@${admin.id}>`).join('\n') || Locale.get("command.config.guild.staff.embed.field.administrator.default.value"), inline: true },
                            { name: Locale.get("command.config.guild.staff.embed.field.administrator.role.name"), value: GuildData.administrators.filter(admin => admin.type === "role" ).map(admin => `<@&${admin.id}>`).join('\n') || Locale.get("command.config.guild.staff.embed.field.administrator.default.value"), inline: true },
                            { name: '\u200b', value: '\u200b', inline: false },
                            { name: Locale.get("command.config.guild.staff.embed.field.moderator.user.name"), value: GuildData.moderators.filter(mod => mod.type === "user" ).map(mod => `<@${mod.id}>`).join('\n') || Locale.get("command.config.guild.staff.embed.field.moderator.default.value"), inline: true },
                            { name: Locale.get("command.config.guild.staff.embed.field.moderator.role.name"), value: GuildData.moderators.filter(mod => mod.type === "role" ).map(mod => `<@&${mod.id}>`).join('\n') || Locale.get("command.config.guild.staff.embed.field.moderator.default.value"), inline: true },
                        ],
                        color: 0x5865F2,
                        footer: {
                            text: Locale.get("generic.embed.footer", [ client.user.username, client.config.version, (member.nickname ?? member.user.username) ])
                        },
                        timestamp: new Date(),
                    }];
                },
            },
        ]
    });

    await menu.send();
    
    let r = await menu.handle();
}

async function editStaff({ GuildData, UserData, LangToUse, interaction, mode, accessLevel }) {
    let key = accessLevel === 'admin' ? 'administrators' : accessLevel === 'mod' ? 'moderators' : null;
    if (!key) throw new BotError("WrongValue", "accessLevel", ["admin", "mod"]);

    if (mode !== "add" && mode !== "rem") throw new BotError("WrongValue", "mode", ["add", "rem"]);

    await interaction.reply({ content: Locale.get("generic.input.mention.mention") });
    let messages = await interaction.channel.awaitMessages({ filter: (m) => {
        if (m.author.id === interaction.member.id && (m.mentions.roles.size > 0 || m.mentions.users.size > 0)) {
            m.delete().catch(() => {});
            return true;
        }
        return false;
    }, max: 1, idle: 5*60_000, errors: ['time'] });
    await interaction.deleteReply(); // delete reply
    if (messages.size < 1) return; // // If no replied roles, do nothing

    let mentions = [
        ...messages.first().mentions.users.array().map(mention => {
            return { type: "user", id: mention.id };
        }),
        ...messages.first().mentions.roles.array().map(mention => {
            return { type: "role", id: mention.id };
        }),
    ];

    
    if (mode === "add") {
        if (accessLevel === "admin") {
            mentions.forEach(mention => GuildData.administrators.addToSet(mention));
            Manager.guild.update(GuildData, {$addToSet: {administrators: {$each: mentions}}});
        }
        
        if (accessLevel === "mod") {
            mentions.forEach(mention => GuildData.moderators.addToSet(mention));
            Manager.guild.update(GuildData, {$addToSet: {moderators: {$each: mentions}}});
        }
    }

    if (mode === "rem") {
        if (accessLevel === "admin") {
            mentions.forEach(mention => GuildData.administrators.pull(mention));
            Manager.guild.update(GuildData, {$pull: {administrators: {$in: mentions}}});
        }
        
        if (accessLevel === "mod") {
            mentions.forEach(mention => GuildData.moderators.pull(mention));
            Manager.guild.update(GuildData, {$pull: {moderators: {$in: mentions}}});
        }
    }
    
    return;
}

async function defineDailyValue({ type, interaction, GuildData, UserData, LangToUse }) {
    let modal = new ModalForm({ title: Locale.get("command.config.commands.embed.title"), translate: true, LangToUse })
        .addRow().addTextField({ name: 'value', label: "command.config.guild.daily.modal.text.label", placeholder: "command.config.guild.daily.modal.text.placeholder" })
    ;

    let result = await modal.setInteraction(interaction).popup();

    if (isNaN(result.get('value'))) return interaction.channel.send({ content: Locale.get("generic.error.number.invalid") }).then(msg => setTimeout(() => msg.delete(), 5_000));

    if (type === "minimum") {
        GuildData.daily.min = Number(result.get('value'));
        await Manager.guild.set(GuildData, { "daily.min": Number(result.get('value')) });
    }
    
    if (type === "maximum") {
        GuildData.daily.max = Number(result.get('value'));
        await Manager.guild.set(GuildData, { "daily.max": Number(result.get('value')) });
    }
    
    if (type === "boost") {
        GuildData.daily.boost = Number(result.get('value'));
        await Manager.guild.set(GuildData, { "daily.boost": Number(result.get('value')) });
    }
}

async function definePointValue({ type, interaction, GuildData, UserData, LangToUse }) {
    let modal = new ModalForm({ title: Locale.get("command.config.commands.embed.title"), translate: true, LangToUse })
        .addRow().addTextField({ name: 'value', label: "command.config.guild.point.modal.text.label", placeholder: "command.config.guild.point.modal.text.placeholder" })
    ;

    let result = await modal.setInteraction(interaction).popup();

    if (isNaN(result.get('value'))) return interaction.channel.send({ content: Locale.get("generic.error.number.invalid") }).then(msg => setTimeout(() => msg.delete(), 5_000));


    if (type === "minimum") {
        GuildData.point.min = Number(result.get('value'));
        await Manager.guild.set(GuildData, { "point.min": Number(result.get('value')) });
    }
    
    if (type === "maximum") {
        GuildData.point.max = Number(result.get('value'));
        await Manager.guild.set(GuildData, { "point.max": Number(result.get('value')) });
    }
    
    if (type === "boost") {
        GuildData.point.boost = Number(result.get('value'));
        await Manager.guild.set(GuildData, { "point.boost": Number(result.get('value')) });
    }
}

async function defineLang({ interaction, GuildData, UserData, LangToUse }) {
    GuildData.lang = interaction.values[0];
    await Manager.guild.set(GuildData, { "lang": interaction.values[0] });
}