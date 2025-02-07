const { EmbedBuilder, Attachment } = require('discord.js');
const util = require("util");
const client = require('../../app');
const fs = require('fs');

const CommandObject = {
    name: "eval",
    category: 'root',
    aliases: ['e'],
    description: null,
    syntax: null,
    userPermission: client.PERMISSION.ROOT,
    
    run: async ({client, message, args, raw, GuildData, UserData, LangToUse }) => {
        client = {...client};
        delete client.token;
        client.config = JSON.parse(JSON.stringify(client.config));
        delete client.config.token;
        delete client.config.bdd;

        let member = message.member;

        let embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setFooter({text: Locale.get("generic.embed.footer", [client.user.username, client.config.version, member.nickname || member.user.username]), iconURL: member.avatarURL({format:'png', size: 32, dynamic: false})})
            .setTimestamp()
        ;

        // Fake logger (to avoid to print things in real console + catch logs to display in reply them)
        let logs = [];

        Logger = {};
        Logger.log = function() {logs.push([...arguments].join(' '))};
        Logger.llog = function() {Logger.log.apply(this, [...arguments])};
        Logger.warn = function() {Logger.log.apply(this, ['[ WARN ]', ...arguments])};
        Logger.info = function() {Logger.log.apply(this, ['[ INFO ]', ...arguments])};
        Logger.error = function() {Logger.log.apply(this, ['[ ERROR ]', ...arguments])};
        Logger.blank = function(n = 1) {
            Logger.log.apply(this, ['\n'.repeat(Math.max(0, n - 1))]);
        }
        Logger.debug = function() {Logger.log.apply(this, ['[ DEBUG ]', ...arguments])};
        Logger.inspect = function() {
            let keys = Object.keys(arguments);

            if (arguments.length > 0) {
                Logger.log.apply(this, [util.inspect(arguments[keys.shift()], {showHidden: false, depth: null, colors: false})]);        
                
                keys.forEach(key => {
                    let argument = arguments[key];
                    Logger.llog.apply(this, [util.inspect(argument, {showHidden: false, depth: null, colors: false})]);
                });
            } else {
                Logger.log([]);
            }
        }

        let filePath = `./hastes`;
        let filename = `${message.author.id}_${message.id}.txt`;
        let inspectResult;

        try {
            // Get output
            if (args.get(0).startsWith('```') && args.get(-1).endsWith('```')) { args.pop(); args.shift(); }
            if (raw.startsWith('```') && raw.endsWith('```')) raw = raw.slice(raw.indexOf(args[0]),-3).trim();

            inspectResult = util.inspect(await eval("(async () => {" + args.join(' ').replace(/console/gm, 'Logger') + "})()"));

            // Add short result
            embed.addFields([{
                name: 'Input :',
                value: ['```js', raw, '```'].join('\n')
            }]);
            
            if (logs.length > 0) {
                embed.addFields([{
                    name: 'Logs :', 
                    value: '```js\n'+ ( logs.join('\n').length > 1000 ? logs.join('\n').slice(0,999) + '…' : logs.join('\n') ) +'```'
                }]);
            }

            if (inspectResult !== 'undefined') {
                embed.addFields([{
                    name: 'Output :', 
                    value: '```js\n'+ ( inspectResult.length > 1000 ? inspectResult.slice(0,999) + '…' : inspectResult ) +'```'
                }]);
            }

            // Create long result
            if (inspectResult.length > 1000 || logs.join('\n').length > 1000) {
                let content = [
                    "# Input",
                    raw || 'N/A',
                    '',
                    "# Logs",
                    logs.join('\n') || 'N/A',
                    '',
                    "# Output",
                    inspectResult,
                ].join('\n');

                if (fs.existsSync(filePath)) {
                    fs.mkdirSync(filePath, { recursive: true });
                }

                fs.writeFileSync(`${filePath}\\${filename}`, content, 'utf-8');
            }
        } catch(err) {
            embed
                .setColor('#FF0000')
                .addFields([
                    {name: 'Error :', value: '```' + Object.getOwnPropertyNames(err).map(k => err[k]).join('') + '```'},
                ])
            ;
        }

        await message.channel.send({ embeds: [ embed ] });
        if (inspectResult.length > 1000 || logs.join('\n').length > 1000) await message.channel.send({ files: [ `${filePath}\\${filename}` ] });
    }
};



CommandObject.description = Locale.get(`commandinfo.${CommandObject.name}.description`) || 'No description';
CommandObject.syntax = Locale.get(`commandinfo.${CommandObject.name}.syntax`) || '¯\\_(ツ)_/¯';

module.exports = CommandObject;