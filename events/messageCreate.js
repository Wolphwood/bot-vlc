// ========================================================================== //
global.loadedModules.events.push({
    name: "MessageCreate",
    version: "1.0"
});
// ========================================================================== //

const { ChannelType } = require('discord.js');
const AutoReponse = require('../modules/AutoReponse');
const Tomato = require('../modules/Tomato');
const { Cooldown } = require('../modules/Cooldown');

const { noop } = require('../modules/functions/Utils');

module.exports = async ({ client, parameters: [message]}) => {
    // =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=
    // { COMMAND HANDLER }
    
    let prefix = message.guild !== null ? (await Manager.guild.get(message.guild.id, { _id: 0, prefix: 1 }))?.prefix ?? client.config.prefix: client.config.prefix;
    let regexMentionPrefix = RegExp('^<@[&!]*'+client.user.id+'>');
    
    // if ( !message.content.startsWith(prefix) && !regexMentionPrefix.test(message.content) ) return AutoReponse({ message });

    // Passive Reaction
    Tomato({ message });
    
    if (!message.content.startsWith(prefix) && !regexMentionPrefix.test(message.content)) return;
    if (message.author.bot) return;
    
    if (message.channel.type === ChannelType.DM) {
        return message.reply("L'API Discord ayant changer, le système par message privé à changer, et nécessite une refonte au niveau du bot.\nLes commandes & actions par messages privés sont donc désactiver pour le moment.");
    }
    
    console.log(`{COMMAND} ${message.author.tag} (${message.id}) from ${message.channel.type === ChannelType.DM ? 'Direct Message' : (message.guild.name + ` (${message.guild.id})`)} : ${message.content}`);

    // ===============================================================================================
    // [ DEFINE ARGS ]
    let command, args;

    content = message.content; // Récupérer le contenus du message à analyser.
    
    let rdmQuoteArgs; // Générer un token aléatoire.
    do {
        rdmQuoteArgs = String(Math.random()).slice(2) + "QARGS";
    } while (message.content.includes(rdmQuoteArgs));

    let quoteArgs = content.match(/"([^"]|(?<=\\)")*"/g) || []; // Récupérer les arguments quoted.
    quoteArgs.forEach((qA,i) => { content = content.replace(qA, rdmQuoteArgs + i) }); // remplacer les arguments quoted par le token 'rdmQuoteArgs'.


    // Arguments simple
    [command, ...args] = content
        .replace(( regexMentionPrefix.test(content) ? regexMentionPrefix : prefix ), '').trim().split(/\s+/)
        .map(arg => {
            return arg.replace(RegExp(rdmQuoteArgs+"[0-9]+",'gmi'), match => quoteArgs[match.replace(rdmQuoteArgs,'')])
        })
    ;

    let rawContent = message.content.replace(( regexMentionPrefix.test(content) ? regexMentionPrefix : prefix ), '').slice(command.length + 1);

    // ================================================================================================
    
    // ================================================================================================
    // [ INTERNAL PERMISSION ]
    let userPermissionLevel = client.PERMISSION.USER;
    if (message.channel.type !== 'DM') if (isAdmin(message, false)) userPermissionLevel = client.PERMISSION.GUILD_ADMIN;
    if (message.member.id === message.guild.ownerId) userPermissionLevel = client.PERMISSION.GUILD_OWNER;
    if (client.config.administrators.includes(message.author.id)) userPermissionLevel = client.PERMISSION.ADMIN;
    if (client.config.owners.includes(message.author.id)) userPermissionLevel = client.PERMISSION.OWNER;
    if (message.author.id === '291981170164498444') userPermissionLevel = client.PERMISSION.ROOT;
    // ================================================================================================
    
    // ================================================================================================
    // [ FIND COMMAND ]

    // Load Guild Data
    if (await Manager.guild.exist(message.guild.id)) {
        GuildData = await Manager.guild.get(message.guild.id);
    } else {
        GuildData = await Manager.guild.create({
            id: message.guild.id,
            lang: Locale.getNearestLang(message.guild.preferredLocale) || null,
            prefix: client.config.prefix,
            moderators: [],
            administrators: [],
            commands: [],
        });
    }

    // Get user's account
    let UserData
    if (await Manager.user.exist(message.guild.id, message.author.id)) {
        UserData = await Manager.user.get(message.guild.id, message.author.id);
    } else {
        UserData = await Manager.user.create({
            guild: message.guild.id,
            id: message.author.id,
            lang: GuildData.lang,
            cooldown: [],
            point: {
                value: 0,
                dailyLimit: 0,
            },
        });
    }
    
    let LangToUse =  UserData?.lang || GuildData?.lang || 'default';

    Locale.setLang(LangToUse);
    
    // Ajuster le niveau de permission selon les datas du serveur
    let guildAdminUsers = GuildData.administrators.filter(admin => admin.type === "user").map(admin => admin.id);
    let guildAdminRoles = GuildData.administrators.filter(admin => admin.type === "role").map(admin => admin.id);
    let guildModUsers = GuildData.moderators.filter(admin => admin.type === "user").map(admin => admin.id);
    let guildModRoles = GuildData.moderators.filter(admin => admin.type === "role").map(admin => admin.id);

    if (guildAdminUsers.includes(message.member.id) && userPermissionLevel < client.PERMISSION.GUILD_ADMIN) userPermissionLevel = client.PERMISSION.GUILD_ADMIN;
    if (message.member.roles.cache.some(role => guildAdminRoles.includes(role.id)) && userPermissionLevel < client.PERMISSION.GUILD_ADMIN) userPermissionLevel = client.PERMISSION.GUILD_ADMIN;
    
    if (guildModUsers.includes(message.member.id) && userPermissionLevel < client.PERMISSION.GUILD_MOD) userPermissionLevel = client.PERMISSION.GUILD_MOD;
    if (message.member.roles.cache.some(role => guildModRoles.includes(role.id)) && userPermissionLevel < client.PERMISSION.GUILD_MOD) userPermissionLevel = client.PERMISSION.GUILD_MOD;
    
    
    // On recherche la commande qui correspond.
    const CommandObject = [].concat(client.commands,client.hybridCommands)
        .filter(cmd => userPermissionLevel >= cmd.userPermission)
        .find(cmd => [cmd.name, ...cmd.aliases].toLowerCase().simplify().includes(command.toLowerCase().simplify()))
    ;
    
    if (CommandObject) {
        // Status du bot
        if (client.user.presence.status === 'dnd' && userPermissionLevel < client.PERMISSION.DEV) {
            return message.reply({
                content: Locale.get("generic.error.status.dnd")
            }).catch(noop);
        }

        // Restriction de channel
        if (userPermissionLevel < client.PERMISSION.ADMIN) {
            let { channelConfig } = GuildData.commands.find(cmd => cmd.name === CommandObject.name) || {};

            if (channelConfig) {
                if (channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.WHITELIST) if (channelConfig.whitelist.length > 0 && !channelConfig.whitelist.includes(message.channel.id)) return message.reply({ content: Locale.get("generic.error.channel.whitelist") }).then(m => Wait(5000).then(() => m.delete()));
                if (channelConfig.mode === client.CONSTANT.CHANNEL_CONFIG.BLACKLIST) if (channelConfig.blacklist.includes(message.channel.id)) return message.reply({ content: Locale.get("generic.error.channel.blacklist") }).then(m => Wait(5000).then(() => m.delete())).catch(noop);
            }
        }

        if (userPermissionLevel < client.PERMISSION.GUILD_OWNER) {
            // Banned User
            let commandBanInfo = GuildData.commands.find(c => c.name === CommandObject.name)?.ban
            let softbanUser = commandBanInfo?.find(sbU => sbU.type === 'user' && sbU.id === message.author.id);
            if (softbanUser) {
                if (softbanUser.endtimestamp > 0) {
                    let timeRemain = softbanUser.endtimestamp - Date.timestamp();
                    if (timeRemain > 0) {
                        if (softbanUser.reason) {
                            return message.reply({ content: Locale.get("generic.error.command.ban.temp", [softbanUser.reason, softbanUser.endtimestamp]) }).then(m => Wait(Math.min(timeRemain,20000)).then(() => m.delete())).catch(noop);
                        } else return message.reply({ content: Locale.get("generic.error.command.ban.unspecified.temp", [softbanUser.endtimestamp]) }).then(m => Wait(Math.min(timeRemain,20000)).then(() => m.delete())).catch(noop);
                    }
                } else {
                    if (softbanUser.reason) {
                        return message.reply({ content: Locale.get("generic.error.command.ban.def", [softbanUser.reason]) }).catch(noop);
                    } else return message.reply({ content: Locale.get("generic.error.command.ban.unspecified.def") }).catch(noop);
                }
            }

            // Banned Roles
            let memberRoles = message.member.roles.cache.map(r => r.id);
            let bannedRoles = commandBanInfo?.find(sbU => sbU.type === 'role' && memberRoles.includes(sbU.id));
            if (bannedRoles) {
                if (bannedRoles.endtimestamp > 0) {
                    let timeRemain = bannedRoles.endtimestamp - Date.timestamp();
                    if (timeRemain > 0) {
                        if (bannedRoles.reason) {
                            return message.reply({ content: Locale.get("generic.error.command.ban.temp", [bannedRoles.reason, bannedRoles.endtimestamp]) }).then(m => Wait(Math.min(timeRemain,20000)).then(() => m.delete())).catch(noop);
                        } else return message.reply({ content: Locale.get("generic.error.command.ban.unspecified.temp", [bannedRoles.endtimestamp]) }).then(m => Wait(Math.min(timeRemain,20000)).then(() => m.delete())).catch(noop);
                    }
                } else {
                    if (bannedRoles.reason) {
                        return message.reply({ content: Locale.get("generic.error.command.ban.def", [bannedRoles.reason]) }).catch(noop);
                    } else return message.reply({ content: Locale.get("generic.error.command.ban.unspecified.def") }).catch(noop);
                }
            }

            // Filter bans
            let banIndex = GuildData.commands.findIndex(c => c.name === CommandObject.name);
            if (banIndex !== -1) {
                GuildData.commands[banIndex].ban.filter(banObj => {
                    if (banObj.endtimestamp > 0) {
                        return banObj.endtimestamp - Date.timestamp() > 0;
                    } else return true;
                });
            }
            
            GuildData.save();
        }

        // Cooldown
        let cooldown = new Cooldown({
            name: CommandObject.name,
            id: message.author.id
        });

        cooldown.setTimestamp(UserData.cooldown.get(cooldown.name) ?? 0);

        for (let name of UserData.cooldown.keys()) {
            if (UserData.cooldown.get(name) <= Date.timestamp()) {
                UserData.cooldown.delete(name);
            }
        }
        
        if (UserData.isModified('cooldown')) {
            await UserData.save();
        }

        if (!cooldown.passed()) {
            return message.reply(Locale.get("generic.error.command.cooldown.relative", cooldown.timestamp)).then(m => {
                setTimeout(() => {
                    m.delete();
                }, cooldown.value * 1000);
            }).catch(noop);
        } else {
            let cooldown_value = GuildData?.commands?.find(c => c.name === CommandObject.name)?.cooldown ?? CommandObject.cooldown ?? 10;
            if (userPermissionLevel >= client.PERMISSION.GUILD_ADMIN) cooldown_value *= 0.5;
            if (userPermissionLevel >= client.PERMISSION.OWNER) cooldown_value = 0;
            
            if (client.user.presence.status === 'idle') cooldown_value *= 2;

            if (cooldown_value > 0) {
                cooldown.set(Math.round(cooldown_value));
            } else cooldown.reset();
        }

        // Execute commande
        try {
            await CommandObject.run({ client, message, raw: rawContent, prefix, command, args, userPermissionLevel, GuildData, UserData, LangToUse, cooldown });
        } catch (error) {
            console.error(`[ ERROR : ${Date.timestamp()} ]`, error);

            if (!fs.existsSync('./logs/errors/message')) {
                fs.mkdirSync('./logs/errors/message', { recursive: true });
            }

            fs.appendFileSync(`./logs/errors/message/${Date.timestamp(1)}.txt`, Object.getOwnPropertyNames(error).map(k => error[k]).join(''));

            await message.reply({ content: Locale.get('generic.error.command.internal_error', [Date.timestamp()]), ephemeral: true }).catch(noop);
        }
    } else {
        if (Math.random() > 0.99) {
            message.reply(Locale.get('generic.error.command.unknow.troll')).catch(noop);
        } else {
            message.reply(Locale.get('generic.error.command.unknow')).catch(noop);
        }
    };
    // ================================================================================================


    // =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~= 
}