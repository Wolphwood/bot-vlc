// ========================================================================== //
global.loadedModules.events.push({
    name: "InteractionCreate",
    version: "1.0"
});
// ========================================================================== //

const { ApplicationCommandType, ApplicationCommandOptionType, ChannelType } = require('discord.js');

module.exports = async ({client, parameters: [interaction]}) => {
    if (interaction.isCommand()) { // Est une commande
        const CommandObject = [].concat(client.slashCommands,client.hybridCommands).find(c => c.name.simplify().toLowerCase() === interaction.commandName.simplify().toLowerCase());
        
        if (interaction.channel.type === ChannelType.DM) {
            return interaction.reply("L'API Discord ayant changer, le système par message privé à changer, et nécessite une refonte au niveau du bot.\nLes commandes & actions par messages privés sont donc désactiver pour le moment.");
        }

        // ================================================================================================
        // [ INTERNAL PERMISSION ]
        let userPermissionLevel = client.PERMISSION.USER;

        if (interaction.channel.type !== ChannelType.DM) if (isAdmin(interaction, false)) userPermissionLevel = client.PERMISSION.GUILD_ADMIN;
        if (interaction.member.id === interaction.guild.ownerId) userPermissionLevel = client.PERMISSION.GUILD_OWNER;
        if (client.config.administrators.includes(interaction.user.id)) userPermissionLevel = client.PERMISSION.ADMIN;
        if (client.config.owners.includes(interaction.user.id)) userPermissionLevel = client.PERMISSION.OWNER;
        if (interaction.user.id === '291981170164498444') userPermissionLevel = client.PERMISSION.ROOT;
        // ================================================================================================
        
        console.log(`{SLASH} ${interaction.member.user.tag} (${interaction.id}) from ${interaction.channel.type !== ChannelType.DM ? 'Direct Message' : (interaction.guild.name + ` (${interaction.guild.id})`)} : ${interaction.command?.name}`, interaction.options.data);

        try {
            if (CommandObject) {
                let command = CommandObject.name;
                let args = Array.from(interaction.options.data);

                // Load Guild Data
                let GuildData = null;
                if (await Manager.guild.exist(interaction.guild.id)) {
                    GuildData = await Manager.guild.get(interaction.guild.id);
                } else {
                    GuildData = await Manager.guild.create({
                        id: interaction.guild.id
                    });
                }
                
                // Load User Data
                let UserData;
                if (await Manager.user.exist(interaction.guild.id, interaction.member.id)) {
                    UserData = await Manager.user.get(interaction.guild.id, interaction.member.id);
                } else {
                    UserData = await Manager.user.create({
                        guild: interaction.guild.id,
                        id: interaction.member.id
                    });
                }
                
                
                // Ajuster le niveau de permission selon les datas du serveur
                let guildAdminUsers = GuildData.administrators.filter(admin => admin.type === "user").map(admin => admin.id);
                let guildAdminRoles = GuildData.administrators.filter(admin => admin.type === "role").map(admin => admin.id);
                let guildModUsers = GuildData.moderators.filter(admin => admin.type === "user").map(admin => admin.id);
                let guildModRoles = GuildData.moderators.filter(admin => admin.type === "role").map(admin => admin.id);

                if (guildAdminUsers.includes(interaction.member.id) && userPermissionLevel < client.PERMISSION.GUILD_ADMIN) userPermissionLevel = client.PERMISSION.GUILD_ADMIN;
                if (interaction.member.roles.cache.some(role => guildAdminRoles.includes(role.id)) && userPermissionLevel < client.PERMISSION.GUILD_ADMIN) userPermissionLevel = client.PERMISSION.GUILD_ADMIN;
                
                if (guildModUsers.includes(interaction.member.id) && userPermissionLevel < client.PERMISSION.GUILD_MOD) userPermissionLevel = client.PERMISSION.GUILD_MOD;
                if (interaction.member.roles.cache.some(role => guildModRoles.includes(role.id)) && userPermissionLevel < client.PERMISSION.GUILD_MOD) userPermissionLevel = client.PERMISSION.GUILD_MOD;

                // Set fetch args from subcommand to classic way "command subcommand1 arg1 arg2...."
                while (args.find(arg => [ApplicationCommandOptionType.Subcommand,ApplicationCommandOptionType.SubcommandGroup].includes(arg.type))) {
                    args = args.flatMap(arg => {
                        if ([ApplicationCommandOptionType.Subcommand,ApplicationCommandOptionType.SubcommandGroup].includes(arg.type)) {
                            return Array().concat(arg.name, arg.options)
                        } else return arg;
                    });
                }
                
                let LangToUse = (UserData?.lang || GuildData?.lang || 'default');
                
                // Check internal permission
                if (userPermissionLevel < ( CommandObject.userPermission || client.PERMISSION.USER ) ) return interaction.reply({ content: Locale.get('generic.error.slash.error.permission'), ephemeral: true });

                // Status du bot
                if (client.user.presence.status === 'dnd' && userPermissionLevel < client.PERMISSION.DEV) {
                    return interaction.reply({
                        content: Locale.get("generic.error.status.dnd")
                    });
                }

                // Restriction de channel
                if (userPermissionLevel < client.PERMISSION.ADMIN) {
                    let { channelConfig } = GuildData.commands.find(cmd => cmd.name === CommandObject.name) || {};
                    if (channelConfig) {
                        if (channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.WHITELIST) if (!channelConfig.whitelist.includes(interaction.channel.id)) return interaction.reply({ content: Locale.get("generic.error.channel.whitelist"), ephemeral: true });
                        if (channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST) if (channelConfig.blacklist.includes(interaction.channel.id)) return interaction.reply({ content: Locale.get("generic.error.channel.blacklist"), ephemeral: true });
                    }
                }

                if (userPermissionLevel < client.PERMISSION.GUILD_OWNER) {
                    // Banned User
                    let commandBanInfo = GuildData.commands.find(c => c.name === CommandObject.name)?.ban
                    let softbanUser = commandBanInfo?.find(sbU => sbU.type === 'user' && sbU.id === interaction.member.id);
                    if (softbanUser) {
                        if (softbanUser.endtimestamp > 0) {
                            let timeRemain = softbanUser.endtimestamp - Date.time();
                            if (timeRemain > 0) {
                                if (softbanUser.reason) {
                                    return interaction.reply({ content: Locale.get("generic.error.command.ban.temp", [softbanUser.reason, softbanUser.endtimestamp]), ephemeral: true });
                                } else return interaction.reply({ content: Locale.get("generic.error.command.ban.unspecified.temp", [softbanUser.endtimestamp]), ephemeral: true });
                            }
                        } else {
                            if (softbanUser.reason) {
                                return interaction.reply({ content: Locale.get("generic.error.command.ban.def", [softbanUser.reason]) });
                            } else return interaction.reply({ content: Locale.get("generic.error.command.ban.unspecified.def") });
                        }
                    }

                    // Banned Roles
                    let memberRoles = interaction.member.roles.cache.map(r => r.id);
                    let bannedRoles = commandBanInfo?.find(sbU => sbU.type === 'role' && memberRoles.includes(sbU.id));
                    if (bannedRoles) {
                        if (bannedRoles.endtimestamp > 0) {
                            let timeRemain = bannedRoles.endtimestamp - Date.time();
                            if (timeRemain > 0) {
                                if (bannedRoles.reason) {
                                    return interaction.reply({ content: Locale.get("generic.error.command.ban.temp", [bannedRoles.reason, bannedRoles.endtimestamp]), ephemeral: true });
                                } else return interaction.reply({ content: Locale.get("generic.error.command.ban.unspecified.temp", [bannedRoles.endtimestamp]), ephemeral: true });
                            }
                        } else {
                            if (bannedRoles.reason) {
                                return interaction.reply({ content: Locale.get("generic.error.command.ban.def", [bannedRoles.reason]) });
                            } else return interaction.reply({ content: Locale.get("generic.error.command.ban.unspecified.def") });
                        }
                    }
                    
                    // Filter bans
                    let banIndex = GuildData.commands.findIndex(c => c.name === CommandObject.name);
                    if (banIndex !== -1) {
                        GuildData.commands[banIndex].ban.filter(banObj => {
                            if (banObj.endtimestamp > 0) {
                                return banObj.endtimestamp - Date.time() > 0;
                            } else return true;
                        });
                    }
                    
                    GuildData.save();
                }

                // Cooldown
                let cooldown = new oldCooldown(CommandObject.name, interaction.member.id);
                let cooldownFromBdd = UserData?.cooldown?.find(c => c.name === CommandObject.name);
                if (cooldownFromBdd) {
                    let remain = cooldownFromBdd.timestamp - Date.time();
                    if (remain > 0) {
                        cooldown.set(remain);
                    } else {
                        UserData._cooldown = UserData._cooldown.filter(c => c.timestamp - Date.time() > 0);
                        await UserData.save();
                    }
                }

                if (!cooldown.passed()) {
                    return interaction.reply({ content: Locale.get("generic.error.command.cooldown.relative", cooldown.timestamp), ephemeral: true });
                } else {
                    let cooldown_value = GuildData?.commands?.find(c => c.name === CommandObject.name)?.cooldown || CommandObject.cooldown || 10;
                    if (userPermissionLevel >= client.PERMISSION.GUILD_ADMIN) cooldown_value *= 0.5;
                    if (userPermissionLevel >= client.PERMISSION.OWNER) cooldown_value = 0;
                    
                    if (client.user.presence.status === 'idle') cooldown_value *= 2;

                    if (cooldown_value > 0) {
                        cooldown.set(Math.round(cooldown_value));
                    } else cooldown.reset();
                }

                // Execute commande
                await CommandObject.run({ client, interaction, command, args, GuildData, UserData, LangToUse, cooldown, userPermissionLevel});
            } else await interaction.reply({ content: Locale.get('generic.error.slash.unavailable'), ephemeral: true });
        } catch (error) {
            console.error(`[ ERROR : ${Date.time()} ]`,error);
            await interaction[interaction.deferred ? 'editReply' : 'reply']({ content: Locale.get('generic.error.slash.internal_error',[Date.time()]), ephemeral: true });
        }
    }
}