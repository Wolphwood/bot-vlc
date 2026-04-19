const { ApplicationCommandType, EmbedBuilder, ApplicationCommandOptionType, ComponentType, ButtonStyle, AttachmentBuilder, TextInputStyle } = require("discord.js");
const client = require("../../app");

const { LocaleManager } = require("../../modules/Locales");

const GIFs = [
    "https://media.tenor.com/1MFEcgJWwlMAAAAj/vault-boy.gif",
    "https://media.tenor.com/zpnDNzectSsAAAAd/freedom.gif",
    "https://media.tenor.com/ZAMoMuQgf9UAAAAd/mapache-pedro.gif",
    "https://media.tenor.com/87MIgsnpji8AAAAd/happy-smiley.gif",
    "https://media.discordapp.net/attachments/977610173021585408/1120445968177975368/1120424021163520131.gif",
    "https://cdn.discordapp.com/attachments/1215999193185784000/1400935035477033190/Cat_Peach.gif",
    "https://cdn.discordapp.com/attachments/990298651291164762/1227907737229463612/0C0362C0-521C-405C-B5EB-640559E900F0.gif",
    "https://cdn.discordapp.com/attachments/1406973030185566228/1406973377620607059/clam-heart.gif",
    "https://media.discordapp.net/attachments/1196470968328134696/1255185126996967524/vcollide_wireframe.gif",
    "https://cdn.discordapp.com/attachments/1118639757744939099/1316930315033251841/flopp.gif",
    "https://cdn.discordapp.com/attachments/1406973030185566228/1406973689848795176/source.gif",
    "https://media.discordapp.net/attachments/1112813442907250770/1120893795962191912/telechargement.gif",
    "https://cdn.discordapp.com/attachments/424232880340729856/1344236082492997682/ZECK_ZOZIZON_VLC_SUPER_NICKEL.gif",
    "https://cdn.discordapp.com/attachments/424232880340729856/1344236254274781204/SUPER_NICKEL.gif",
]

module.exports = {
    name: "bravo",
    userPermission: client.PERMISSION.GUILD_MOD,
    type: ApplicationCommandType.ChatInput,
    run: async ({client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
        let discordElement = message ?? interaction;
        let { member } = discordElement;
        
        let embed = new EmbedBuilder()
            .setTitle("Problème résolu !")
            .setColor("#00ff00")
            .addFields([
                {
                    name: '\u200b',
                    value: "Le problème ci-dessus est désormais résolu!\nMais votre ticket reste ouvert pour toute autre question, donc n'hésitez pas ! <a:sparkles:1406973307772862576> "
                }
            ])
            .setImage(GIFs.getRandomElement())
            .setFooter({
                text: `Par ${member.nickname || member.user.globalName}`
            })
            .setTimestamp()
        ;

        if (message) {
            await message.reply({ embeds: [ embed ], allowedMentions: { repliedUser: false } })
            message.delete();
        }

        if (interaction) {
            interaction.reply({ embeds: [embed] });
        }
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;