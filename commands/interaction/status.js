const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, PermissionFlagsBits } = require('discord.js');
const Emotes = require('../../assets/Emotes');
const client = require('../../app');


const CommandObject = {
    name: "status",
    aliases: [],
    description: null,
    syntax: null,
    userPermission: client.PERMISSION.ROOT,
    category: 'root',
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "status",
            description: Locale.get(`commandinfo.status.option.status.description`),
            required: true,
            choices: ['online','idle','dnd'].map(value => Object({ name: Locale.get(`generic.status.`+ value), value })),
        }
    ],
    run: async function({client, interaction, args, GuildData, UserData, LangToUse }) {
        if (!interaction && !message) throw new Error("NO_INTERACTION_ELEMENT");
        
        if (interaction) {
            member = interaction.member;
            discordElement = interaction;
        }
        
        let status =  args.find(arg => arg.name === 'status')?.value || 'online';
        
        client.user.setStatus(status);
        
        let statusName = Locale.get("generic.status."+ status)
        discordElement.reply({ content: Locale.get(`command.status.success`, statusName), ephemeral: true});
    },
};

CommandObject.description = Locale.get(`commandinfo.${CommandObject.name}.description`) || 'No description';
CommandObject.syntax = Locale.get(`commandinfo.${CommandObject.name}.syntax`) || '¯\\_(ツ)_/¯';



module.exports = CommandObject;