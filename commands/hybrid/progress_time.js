import { ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder } from "discord.js";
import Locales from "#modules/Locales";
import Emotes from "#modules/Emotes";

export default {
  name: "YearProgress",
  aliases: ['yp', 'yearprogress'],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "mode",
        description: "Afficher le temps écoulé ou restant",
        required: false,
        choices: [
          { name: "Restant (Remain)", value: 'remain' },
          { name: "Écoulé (Elapsed)", value: 'elapsed' },
        ]
      },
      {
        type: ApplicationCommandOptionType.Boolean,
        name: "ascii",
        description: "Utiliser des caractères ASCII",
        required: false,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "color",
        description: "Couleur de la barre (hors ASCII)",
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
        description: "Affichage compact",
        required: false,
      },
    ],
  },
  
  run: async ({ interaction, message, args }) => {
    const discordElement = interaction || message;
    
    // Valeurs par défaut
    let config = {
      mode: 'elapsed',
      ascii: false,
      color: 'blue',
      compact: true
    };

    // Parsing des arguments (Message / ChatInput)
    if (interaction) {
      config.mode = interaction.options.getString('mode') ?? config.mode;
      config.ascii = interaction.options.getBoolean('ascii') ?? config.ascii;
      config.color = interaction.options.getString('color') ?? config.color;
      config.compact = interaction.options.getBoolean('compact') ?? config.compact;
    } else if (message) {
      const sargs = args.map(a => a.simplify().toLowerCase());
      const colorReg = /(red|rouge|blue|bleu|jaune|yellow|green|vert|brown|marron)/gi;
      
      if (['remain', 'restant'].includes(sargs[0])) config.mode = 'remain';
      config.ascii = sargs.includes('ascii');
      config.compact = sargs.includes('compact') || sargs.includes('compacte');
      config.color = sargs.join(' ').match(colorReg)?.[0]?.replace('bleu', 'blue').replace('vert', 'green') ?? config.color;
    }

    const progress = getYearProgress();
    const isRemain = config.mode === 'remain';
    const valueToDisplay = isRemain ? progress.remaining : progress.elapsed;

    const progressBar = BuildProgressBar({
      value: valueToDisplay,
      color: config.color,
      compact: config.compact,
      ascii: config.ascii
    });

    const embed = new EmbedBuilder()
      .setColor(isRemain ? 0xFFA500 : 0x5865F2)
      .setTitle(Locales.get(isRemain ? 'command.yearprogress.title.remain' : 'command.yearprogress.title.elapsed', [valueToDisplay]))
      .addFields([{ name: '\u200b', value: progressBar }])
      .setFooter({ text: `${new Date().getFullYear()} Progress` });

    return discordElement.reply({ embeds: [embed] });
  },
};

/**
 * Génère la barre de progression
 */
function BuildProgressBar({ value, color, compact, ascii }) {
  const steps = ascii ? (compact ? 20 : 30) : (compact ? 12 : 24);
  const stepValue = 100 / steps;
  let output = [];

  for (let i = 1; i <= steps; i++) {
    const v = stepValue * i;
    const isFull = Math.floor(value) >= v;
    const isPartial = value >= v - stepValue;

    if (ascii) {
      output.push(isFull ? `▓` : isPartial ? `▒` : `░`);
    } else {
      const type = i === 1 ? 'start' : i === steps ? 'end' : 'middle';
      const state = isFull ? 'full' : isPartial ? 'partial' : 'empty';
      output.push(Emotes.progress[color]?.[type]?.[state] || Emotes.progress.blue[type][state]);
    }
  }

  return output.join('');
}

/**
 * Calcule le pourcentage de l'année
 */
function getYearProgress() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);

  const elapsed = ((now - start) / (end - start)) * 100;
  
  return {
    elapsed: elapsed.toFixed(2),
    remaining: (100 - elapsed).toFixed(2)
  };
}