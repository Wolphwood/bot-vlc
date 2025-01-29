const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle } = require("discord.js");
const client = require("../../app");
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const IMAGE_API = "https://randomfox.ca/";

client.APIs.push({ name: "Random Fox", link: IMAGE_API });

module.exports = {
    name: "fox",
    aliases: ["renard","f"],
    category: "fun",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "image",
            aliases: ["img", "i"],
            description: Locale.get(`commandinfo.fox.option.image.description`),
        },
    ],
    run: async ({client, interaction, message, args, GuildData, UserData, LangToUse }) => {
        let discordElement = message || interaction;
        let member = discordElement.member;

        let subcommand = "image";
        
        let embed, response, data;
        switch (subcommand.toLowerCase().simplify()) {
            default:
                try {
                    // CALL API
                    response = await fetch(IMAGE_API + "floof");
                } catch {}
                
                if (response.status !== 200) { // Handle API's failures
                    discordElement.reply({
                        content: Locale.get("command.fox.error.api_failure"),
                    }).then(m => {
                        if (message) Wait(5_000).then(() => m.delete());
                    });
                    return false;
                }

                data = await response.json();
                embed = new EmbedBuilder()
                    .setColor(Array.from(Array(3), () => getRandomRangeRound(127,255)))
                    .setImage(data.image)
                    .setFooter({ text: Locale.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
                    .setTimestamp()
                ;

                if (interaction) interaction.reply({ embeds: [ embed ] });
                if (message) message.channel.send({ embeds: [ embed ] });
            break;
        }
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;