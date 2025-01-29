const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle } = require("discord.js");
const client = require("../../app");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = "https://api.agify.io/";

client.APIs.push({ name: "Agify", link: API });

module.exports = {
    name: "YearProgress",
    aliases: ['yp'],
    category: "fun",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "mode",
            description: "Bar Color (non ascii bars)",
            required: false,
            choices: [
                { name: "Remain", value: 'remain' },
                { name: "Elapsed", value: 'elapsed' },
            ]
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: "ascii",
            description: "ASCII display",
            required: false,
        },
        {
            type: ApplicationCommandOptionType.String,
            name: "color",
            description: "Bar Color (non ascii bars)",
            required: false,
            choices: [
                { name: "Blue", value: 'blue' },
                { name: "Green", value: 'green' },
                { name: "Yellow", value: 'yellow' },
                { name: "Brown", value: 'brown' },
            ]
        },
        {
            type: ApplicationCommandOptionType.Boolean,
            name: "compact",
            description: "Compact display",
            required: false,
        },
    ],
    run: async ({client, interaction, message, args, GuildData, UserData, LangToUse }) => {
        let discordElement = message || interaction;
        let member = discordElement.member;

        // Parse Args
        let [mode, ascii, color, compact] = ['elapsed', false, 'blue', true];
        
        if (message) {
            let colorReg = /(red|rouge|blue|bleu|jaune|yellow)/gi;
            let sargs = args.map(a => a.simplify().toLowerCase());
            
            mode = args.shift();
            ascii = sargs.includes('ascii');
            color = sargs.join(' ').match(colorReg)?.get(0) ?? color;
            compact = sargs.includes('compact') || sargs.includes('compacte');
        }

        if (interaction) {
            mode = args.find(a => a.name == "mode")?.value ?? mode;
            ascii = args.find(a => a.name == "ascii")?.value ?? ascii;
            color = args.find(a => a.name == "color")?.value ?? color;
            compact = args.find(a => a.name == "compact")?.value ?? compact;
        }

        let progress = getYearProgress();

        if (mode == "remain") {
            let p = BuildProgressBar({
                value: progress.remaining,
                color, compact, ascii,
            });
            discordElement.reply({
                embeds: [{
                    color: 0xFFFFFF,
                    title: `Temps restant de l'année : ${progress.remaining}%`,
                    fields: [{
                        name: '\u200b',
                        value: p
                    }]
                }]
            });

        } else
        if (mode == "elapsed") {
            let p = BuildProgressBar({
                value: progress.elapsed,
                color, compact, ascii,
            });
            discordElement.reply({
                embeds: [{
                    color: 0xFFFFFF,
                    title: `Progression de l'année : ${progress.elapsed}%`,
                    fields: [{
                        name: '\u200b',
                        value: p
                    }]
                }]
            });

        } else {
            discordElement.reply(`Unknown mode : \`${mode}\``);
        }
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;

function BuildProgressBar({ value, color, compact, ascii } = {}) {
    let output = [];

    let steps = ascii ? (compact ? 27 : 30) : (compact ? 15 : 27) 

    let stepvalue = 100 / steps;

    for (let i = 1; i <= steps; i++) {
        let v = stepvalue * i;

        if (ascii) {
            output.push(Math.floor(value) >= v ? `▓` : value >= v - stepvalue ? `▒` : `░`);
        } else {
            output.push(Emotes.progress[color ?? 'blue'][i == 1 ? 'start' : i == steps ? 'end' : 'middle'][Math.floor(value) >= v ? 'full' : value >= v - stepvalue  ? 'partial' : 'empty']);
        }
    }

    return output.join('');
}

function getYearProgress() {
    const now = new Date(); // Date actuelle
    const startOfYear = new Date(now.getFullYear(), 0, 1); // Début de l'année (1er janvier)
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1); // Début de l'année suivante

    const totalTime = endOfYear - startOfYear;
    const elapsedTime = now - startOfYear;

    const percentageElapsed = (elapsedTime / totalTime) * 100;
    const percentageRemaining = 100 - percentageElapsed;

    return {
        elapsed: percentageElapsed.toFixed(2),
        remaining: percentageRemaining.toFixed(2)
    };
}