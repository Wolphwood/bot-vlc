const { EmbedBuilder, Attachment } = require('discord.js');
const { inspect } = require("util");
const client = require('../../app');
const fs = require('fs');

const CommandObject = {
    name: "eval",
    category: 'root',
    aliases: ['e'],
    description: null,
    syntax: null,
    userPermission: client.PERMISSION.ROOT,
    
    run: async ({client, message, args, GuildData, UserData, LangToUse }) => {
        client = {...client};
        delete client.token;
        delete client.config.token;
        delete client.config.bdd;

        let member = message.member;

        let embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setFooter({text: Locale.get("generic.embed.footer", [client.user.username, client.config.version, member.nickname || member.user.username]), iconURL: member.avatarURL({format:'png', size: 32, dynamic: false})})
            .setTimestamp()
        ;

        let filePath = `./hastes/`;
        let filename = `${message.author.id}_${message.id}.txt`;
        let inspectResult;

        try {
            // Get output
            inspectResult = inspect(await eval("(async () => {" + args.join(' ') + "})()"));

            // Add short result
            embed
                .addFields([
                    {name: 'Input :', value: ['```js\n', ...args, '```'].join(' ') },

                    ...inspectResult.match(/[\S\s]{0,1000}/gmu).filter(l => l.length > 0).slice(0,5).map((p,i) => {
                        return {name: (i === 0 ? 'Output :' : '\u200b'), value: ['```js\n', p, '```'].join(' ')};
                    }),
                ])
            ;

            // Create long result
            if (inspectResult.length > 1_000) {
                fs.writeFileSync(filePath+filename, inspectResult, 'utf-8');
            }
        } catch(err) {
            console.error(err);
            embed
                .setColor('#FF0000')
                .addFields([
                    {name: 'Error :', value: '```'+ err.message +'```'},
                    {name: '\u200b', value: '```'+ err +'```'},
                ])
            ;
        }

        await message.channel.send({ embeds:[ embed ] });
        if (inspectResult?.length > 1_000) message.channel.send({ files: [ filePath+filename ] });
    }
};



CommandObject.description = Locale.get(`commandinfo.${CommandObject.name}.description`) || 'No description';
CommandObject.syntax = Locale.get(`commandinfo.${CommandObject.name}.syntax`) || '¯\\_(ツ)_/¯';

module.exports = CommandObject;