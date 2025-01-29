const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle } = require("discord.js");
const client = require("../../app");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = "https://api.agify.io/";

client.APIs.push({ name: "Agify", link: API });

module.exports = {
    name: "age",
    aliases: ["agify"],
    category: "fun",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "name",
            description: Locale.get(`commandinfo.age.option.nom.description`),
            required: true,
        },
    ],
    run: async ({client, interaction, message, args, GuildData, UserData, LangToUse }) => {
        let discordElement = message || interaction;
        let member = discordElement.member;
        
        // Check if args
        if (!args[0]) return discordElement.reply({ content: Locale.get("command.dog.error.no_name") });
        
        // Parse Args
        let name;
        if (message) name = args.shift();
        if (interaction) name = args.shift().value;

        // Fetch API
        let response = null;
        try {
            // CALL API
            response = await fetch(API + "?" + new URLSearchParams({name}));
        } catch {}
        
        if (response?.status === 429) return discordElement.channel.send({ content: Locale.get("command.age.error.429") });
        if (response?.status !== 200) { // Handle API's failures
            discordElement.reply({
                content: Locale.get("command.age.error.api_failure"),
            }).then(m => {
                if (message) Wait(5_000).then(() => m.delete());
            });
            return false;
        }

        let data = await response.json();
        embed = new EmbedBuilder()
            .setColor(Array.from(Array(3), () => getRandomRangeRound(80,255)))
            .addFields([
                {
                    name: Locale.get("command.age.embed.field.name", name.ucFirst()),
                    value: Locale.get("command.age.embed.field.value", [ data.count, name, data.age || '?' ]),
                }
            ])
            .setFooter({ text: Locale.get("generic.embed.footer", [ (discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username ]) })
            .setTimestamp()
        ;

        if (interaction) interaction.reply({ embeds: [ embed ] });
        if (message) message.channel.send({ embeds: [ embed ] });
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;