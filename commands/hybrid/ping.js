const { ApplicationCommandType, EmbedBuilder } = require("discord.js");

module.exports = {
    name: "ping",
    description: "Ping command",
    type: ApplicationCommandType.ChatInput,
    run: async ({client, interaction, message, args, GuildData, UserData, LangToUse }) => {
        
        if (interaction) {
            const msg = await interaction.channel.send({ content: "Ping..." });
            msg.delete();

            await interaction.reply({
                content: "\u200b",
                embeds: [ getEmbed({ client, msg, interaction }) ]
            });
        }

        
        if (message) {
            const msg = await message.reply({ content: "Ping..." });
            msg.edit({
                content: "\u200b",
                embeds: [ getEmbed({ client, msg, message }) ]
            });
        }
    },
};

function getEmbed({ client, msg, message, interaction }) {
    return new EmbedBuilder()
        .setTitle('Pong 🏓')
        .setDescription([
            "**Server**: `" + (msg.createdTimestamp - (message||interaction).createdTimestamp) + "ms`",
            "**API**: `" + (client.ws.ping) + "ms`",
            "**Uptime**: \u200b" + "<t:"+ (Date.timestamp() - Math.round(client.uptime/1000)) +":R> "
        ].join("\n"))
        .setColor(Array.from(Array(3), () => getRandomRangeFloor(127,255)))
        .setFooter({ text: `${client.user.username} v${client.config.version}` })
        .setImage('https://media4.giphy.com/media/fvA1ieS8rEV8Y/giphy.gif')
        .setTimestamp()
    ;
}