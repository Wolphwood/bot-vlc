const client = require('../../app');

const CommandObject = {
    name: "shutdown",
    aliases: ['shut'],
    description: null,
    syntax: null,
    userPermission: client.PERMISSION.ROOT,
    category: 'root',
    run: async ({ client, message, prefix, command, args, userPermissionLevel, GuildData, UserData }) => {
        await message.channel.send(Locale.get('command.shutdown.success'));
        process.exit();
    }
};

CommandObject.description = Locale.get(`commandinfo.${CommandObject.name.replace(/-/gi,'')}.description`) || 'No description';
CommandObject.syntax = Locale.get(`commandinfo.${CommandObject.name.replace(/-/gi,'')}.syntax`) || '¯\\_(ツ)_/¯';



module.exports = CommandObject;