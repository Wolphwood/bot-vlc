// ========================================================================== //
global.loadedModules.events.push({
    name: "Custom Database Logging",
    version: "1.0"
});
const { EmbedBuilder } = require("discord.js");
// ========================================================================== //

const client = require("../app");

client.CONSTANT.LOG = {
    set_point: {
        type: "set_point",
        channel: "point",
        reason: "Définition des points d'un utilisateur.",
        color: [180, 80, 255],
    },
    add_point: {
        type: "add_point",
        channel: "point",
        reason: "Ajout de point à l'utilisateur.",
        color: [0, 255, 0],
    },
    remove_point: {
        type: "remove_point",
        channel: "point",
        reason: "Suppression de point à l'utilisateur.",
        color: [255, 0, 0],
    },
    daily: {
        type: "daily",
        channel: "point",
        reason: "Commande Daily.",
        color: [0,160,255],
    },
    command_ban: {
        type: "command_ban",
        channel: "ban",
        reason: "Restriction des droits d'utilisations d'une commande pour un utilisateur.",
        color: [255,0,0]
    },
    admin_command_ban: {
        type: "admin_command_ban",
        channel: "ban",
        reason: "Restriction des droits d'utilisations d'une commande pour un utilisateur par un administrateur.",
        color: [200,0,0]
    },
    mod_command_ban: {
        type: "mod_command_ban",
        channel: "ban",
        reason: "Restriction des droits d'utilisations d'une commande pour un utilisateur par un modérateur.",
        color: [200,0,0]
    },
    spam_command_ban: {
        type: "spam_command_ban",
        channel: "ban",
        reason: "Restriction automatique des droits d'utilisations d'une commande pour un utilisateur pour spam.",
        color: [200,0,0]
    },
    rank_add: {
        type: "rank_add",
        channel: "rank",
        reason: "Ajout d'un rôle de ranking.",
        color: [0,255,0]
    },
    rank_remove: {
        type: "rank_remove",
        channel: "rank",
        reason: "Ajout d'un rôle de ranking.",
        color: [255,0,0]
    },
    mark_rankable: {
        type: "mark_rankable",
        channel: "rankable",
        reason: "Utilisateur marquer comme classable.",
        color: [0,255,0]
    },
    mark_unrankable: {
        type: "mark_unrankable",
        channel: "rankable",
        reason: "Utilisateur marquer comme non classable.",
        color: [255,0,0]
    },
}

module.exports = async ({client, parameters:[logdata]}) => {
    let { guild, type, target, author, data, reason, GuildData } = logdata;

    if (!type) throw new Error("TYPE_TARGET_UNDEFINED");
    if (!guild) throw new Error("GUILD_TARGET_UNDEFINED");
    if (!target) throw new Error("LOG_TARGET_UNDEFINED");
    
    if (!GuildData) {
        // console.error(`GuildData isn't defined for event :`, type);
        GuildData = await Manager.guild.get(guild);
    }

    const LangToUse = GuildData?.lang;

    let authorMember = client.guilds.resolve(guild)?.members.resolve(author);

    let UIDS = await Manager.log.getAllUID(guild);

    // embed
    const embed = new EmbedBuilder()
        .setTitle(type)
        .setDescription(client.CONSTANT.LOG[type].reason)
        .addFields(await getFields({ guild, type, target, author, data, reason, GuildData, authorMember, LangToUse }))
        .setColor(client.CONSTANT.LOG[type].color)
        .setFooter({ text: Locale.get("generic.embed.footer", [client.user.username, client.config.version, authorMember.user.username]) })
        .setTimestamp()
    ;

    // Send message into logs channel
    let logChannel = GuildData?.logging[client.CONSTANT.LOG[type].channel] ?? GuildData?.logging.default;

    await client.guilds.resolve(GuildData?.id)?.channels.resolve(logChannel)?.send({ embeds: [ embed ] });
    
    // Log it into BDD
    const Log = await Manager.log.create({
        uid: CreateUID(UIDS, {size: 8}),
        guild,
        type: client.CONSTANT.LOG[type].type || type,
        target,
        author: author || client.user.id,
        data,
        timestamp: Date.time(),
        reason: reason || client.CONSTANT.LOG[type].reason || "¯\\_(ツ)_/¯",
    });
    await Log.save();
}

const emptyString = Array.from(Array(4000), () => `\u200b`).join(' ');
async function getFields({ guild, type, target, author, data, reason, GuildData, UserData, authorMember, LangToUse }) {
    let targetMembers = await GetMultipleMembers(guild, Array.isArray(target) ? target : [].concat(target), true, true);

    let infoKey, fields;
    switch(type) {
        case "daily":
        case "add_point": case "remove_point": case "set_point":
            infoKey = type === 'daily' ? 'log.embed.field.add_point.value' : 'log.embed.field.'+ type +'.value';
            fields = [
                {
                    name: Locale.get("log.embed.field.author.name")  + emptyString.slice(0,30),
                    value: `• <@${authorMember.id}>`,
                    inline: true,
                },
                {
                    name: Locale.get("log.embed.field.target.name") + emptyString.slice(0,30),
                    value: targetMembers.map(targetMember => `• <@${targetMember.id}>`).join('\n'),
                    inline: true,
                },
                {
                    name: Locale.get("log.embed.field.reason.name"),
                    value: reason || "No reason provided.",
                    inline: false,
                },
                {
                    name: Locale.get("log.embed.field.info.name"),
                    value: Locale.get(infoKey, [ data.value, data.result ]),
                    inline: false,
                },
            ];
        break;
        
        case "mark_rankable":
        case "mark_unrankable":
            infoKey = data.rankable ? 'log.embed.field.rankable.value' : 'log.embed.field.unrankable.value';
            fields = [
                {
                    name: Locale.get("log.embed.field.author.name")  + emptyString.slice(0,30),
                    value: `• <@${authorMember.id}>`,
                    inline: true,
                },
                {
                    name: Locale.get("log.embed.field.target.name") + emptyString.slice(0,30),
                    value: targetMembers.map(targetMember => `• <@${targetMember.id}>`).join('\n'),
                    inline: true,
                },
                {
                    name: Locale.get("log.embed.field.reason.name"),
                    value: reason || "No reason provided.",
                    inline: false,
                },
                {
                    name: Locale.get("log.embed.field.info.name"),
                    value: Locale.get(infoKey),
                    inline: false,
                },
            ];
        break;
            

        default:
            fields = [];
    }

    return fields;
}