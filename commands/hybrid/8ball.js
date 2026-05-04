import { doubleMetaphone } from 'double-metaphone'
import { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, MessageFlags, ComponentType, SeparatorSpacingSize, ButtonStyle, Attachment } from "discord.js";

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

import { DiscordMenu, ModalForm, noop } from "#modules/Utils";
import Emotes from "#modules/Emotes";

const TrollAnswers = [
  { answer: "Hé gros sayer, pose pas deux fois la même question.", cooldown: 7200, color: 0x9B59B6 }, // Améthyste
  { answer: "Source : t'inquiète même pas.", cooldown: 3600, color: 0x8E44AD },
  { answer: "Demande à ton chat, il en sait plus que moi.", cooldown: 1800, color: 0xFF00FF }, // Magenta
  { answer: "Mdr tu crois vraiment que je vais répondre à ça ?", cooldown: 3600, color: 0x2C3E50 }, // Bleu nuit
  { answer: "Bah logiquement... non.", cooldown: 3600, color: 0xE67E22 }, // Carotte
  { answer: "Google est ton ami, je ne suis qu'une boule de billard.", cooldown: 1800, color: 0x34495E },
  { answer: "La réponse est cachée derrière toi. (Nan je rigole).", cooldown: 0, color: 0x000000 }, // Noir
  { answer: "C'est un grand OUI, mais juste pour te faire plaisir.", cooldown: 3600, color: 0x1ABC9C }, // Turquoise
  { answer: "Écoute... même moi j'ai pas la réponse là.", cooldown: 1800, color: 0xBDC3C7 }, // Argent
  { answer: "Signes incertains, reviens quand tu seras sobre.", cooldown: 1800, color: 0xD35400 } // Citrouille
];

const PossibleAnswers = [
  // --- POSITIVES (Vert) ---
  { answer: "C'est certain", cooldown: 3600, color: 0x2ECC71 },
  { answer: "C'est décidément ainsi", cooldown: 3600, color: 0x2ECC71 },
  { answer: "Sans aucun doute", cooldown: 3600, color: 0x2ECC71 },
  { answer: "Oui, définitivement", cooldown: 3600, color: 0x2ECC71 },
  { answer: "Vous pouvez compter dessus", cooldown: 3600, color: 0x2ECC71 },
  { answer: "Comme je le vois, oui", cooldown: 3600, color: 0x27AE60 },
  { answer: "Très probablement", cooldown: 3600, color: 0x27AE60 },
  { answer: "Perspectives bonnes", cooldown: 3600, color: 0x27AE60 },
  { answer: "Oui", cooldown: 3600, color: 0x27AE60 },
  { answer: "Les signes pointent vers un oui", cooldown: 3600, color: 0x27AE60 },

  // --- NEUTRES (Jaune/Orange) ---
  { answer: "Réponse vague, essayez à nouveau", cooldown: 10, color: 0xF1C40F },
  { answer: "Redemandez plus tard", cooldown: 10, color: 0xF1C40F },
  { answer: "Mieux vaut ne pas vous le dire maintenant", cooldown: 1800, color: 0xF39C12 },
  { answer: "Impossible de prédire maintenant", cooldown: 1800, color: 0xF39C12 },
  { answer: "Concentrez-vous et redemandez", cooldown: 10, color: 0xF39C12 },

  // --- NÉGATIVES (Rouge) ---
  { answer: "Ne comptez pas là-dessus", cooldown: 3600, color: 0xE74C3C },
  { answer: "Ma réponse est non", cooldown: 3600, color: 0xE74C3C },
  { answer: "Mes sources disent que non", cooldown: 3600, color: 0xE74C3C },
  { answer: "Perspectives pas si bonnes", cooldown: 3600, color: 0xC0392B },
  { answer: "Très peu probable", cooldown: 3600, color: 0xC0392B }
];

const cache = new Map();

function ToPhonetik(str) {
  const sanitized = str
    .toLowerCase()
    .replace(/<a?:.+?:\d+>/g, "")
    .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDFFF])/g, "")
    .simplify()
    .replace(/[^a-z0-9]/g, '')
    .replace(/(.)\1+/g, "$1")
    // --- Patch phonétique manuel pour le français ---
    .replace(/est?[cs]e/g, "es")
    .replace(/vais?/g, "ve")
    .replace(/j[e']?ve?/g, "jv")
    .replace(/que?/g, "k")
    .replace(/ch/g, "s")
    .replace(/h(?=[aeiouy])/g, "") // haha → aa
    // ------------------------------------------------
    .replace(/(.)\1+/g, "$1")
  ;

  // console.log(sanitized)

  return doubleMetaphone(sanitized);
}

function EnsurePath(...args) {
  const folderpath = path.join.apply(this, args);
  if (!fs.existsSync(folderpath)) fs.mkdirSync(folderpath, { recursive: true });
  return folderpath;
}

async function Generate8BallAnswerImage(textToDraw) {
  const FolderPath = EnsurePath('./assets/8ball');
  
  const width = 500;
  const height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Load bg
  const background = await loadImage(path.join(FolderPath, 'ball-back.png'));
  ctx.drawImage(background, 0, 0, width, height);

  // Setup Font
  const fontSize = 30;
  ctx.font = `bold ${fontSize}px "Helvetica", "Arial", sans-serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 3;

  // Setup text area
  const centerX = width / 2;
  const centerY = height / 2;
  const maxLineWidth = 300;
  const lineHeight = fontSize + 10;

  // Wrap Text Algortithm
  const words = textToDraw.split(' ');
  let lines = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    let word = words[i];
    let width = ctx.measureText(currentLine + " " + word).width;
    if (width < maxLineWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  // Draw Text
  const totalHeight = lines.length * lineHeight;
  let startY = centerY - (totalHeight / 2) + (lineHeight / 2);

  lines.forEach((line, index) => {
    ctx.fillText(line, centerX, startY + (index * lineHeight));
  });

  // Return Image
  return canvas.toBuffer('image/png');
}

function GetCached8BallAnswer({ key, id, question } = {}) {
  const phoneticHash = ToPhonetik(question || '')[0];
  const cacheKey = key || `${id}:${phoneticHash}`;

  if (!cacheKey) return null;

  const data = cache.get(cacheKey) ?? { 
    key: cacheKey, id, question 
  };

  if (!data.answer) {
    const isTroll = Math.random() > 0.99;
    const pool = isTroll ? TrollAnswers : PossibleAnswers;
    const selected = pool.getRandomElement();
    
    Object.assign(data, selected);
  };

  if (data.timeout) clearTimeout(data.timeout);

  data.timeout = setTimeout(() => cache.delete(cacheKey), data.cooldown * 1000);

  cache.set(cacheKey, data);

  return data;
}



async function Get8BallAnswerImage(answer) {
  const FolderPath = EnsurePath('./assets/8ball');
  const AnswserPath = EnsurePath(FolderPath, 'answers');
  const phonetik = ToPhonetik(answer)[0];

  const imagePath = path.join(AnswserPath, `${phonetik}.png`);

  if (!fs.existsSync(imagePath)) {
    const buffer = await Generate8BallAnswerImage(answer);
    fs.writeFileSync(imagePath, buffer);

    return buffer;
  }

  return fs.readFileSync(imagePath);
}

export default {
  name: "8Ball",
  aliases: ["8"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "question",
        // description: "Pose ta question",
        required: true
      }
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    const discordElement = interaction || message;
    const member = discordElement.member;

    if (interaction) await interaction.deferReply();

    let question = null;

    // Parse Args
    if (interaction) {
      const index = args.findIndex(arg => arg.name === "question");
      if (index >= 0) question = args[index].value;
    } else
    if (message) {
      question = args.join(' ');
    }

    if (!question) {
      const QuestionMenu = new DiscordMenu({
        v2 : true,
        element: discordElement,
        collectorOptions: { idle: 10 * 60_000 },
        onEnd({ resolve }) { resolve(this.data.question) },
        data: { question: null },
        pages: [{
          files: [{
            attachment: './assets/8ball/ball.png',
            name: "ball.png"
          }],
          components: [{
            type: ComponentType.Container,
            accent_color: [...TrollAnswers, ...PossibleAnswers].map(a => a.color).unique().getRandomElement(),
            components: [
              `# Pose ta question <@${member.id}>`,
              {
                type: ComponentType.MediaGallery,
                items: [{
                  media: { url: "attachment://ball.png" }
                }]
              },
              '---',
              [{
                label: "Poser la question",
                style: ButtonStyle.Primary,
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Pose ta question", time: 120_000 })
                    .addRow().addTextField({ name: 'question', label: "Ta question", placeholder: "Ceci est une question" })
                  ;
                  
                  let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                  if (!result || !result.get('question')) return false;

                  this.data.question = result.get('question');
                  this.stop();
                  
                  return true;
                }
              }]
            ]
          }]
        }]
      });

      await QuestionMenu.send();
      question = await QuestionMenu.handle({ client });

      if (!question) return;
    }
    
    const data = GetCached8BallAnswer({ id: member.id, question });

    const imagebuffer = await Get8BallAnswerImage(data.answer);

    await discordElement.reply({
      flags: [ MessageFlags.IsComponentsV2 ],
      files: [{
        attachment: imagebuffer,
        name: "answer.png"
      }],
      components: [{
        type: ComponentType.Container,
        accent_color: data.color || 0xFFFFFF,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: [
              `# Question de ${member.displayName}`,
              `## ${data.question}`,
              '',
              `### ${data.answer}`,
              '',
            ].join('\n')
          },
          {
            type: ComponentType.MediaGallery,
            items: [{
              media: { url: "attachment://answer.png" }
            }]
          },
          {
            type: ComponentType.Separator,
            divider: true,
            spacing: SeparatorSpacingSize.Small
          },
          {
            type: ComponentType.ActionRow,
            components: [
              {
                type: ComponentType.Button,
                label: "Supprimer",
                style: ButtonStyle.Secondary,
                customId: `DELETE:GUILD_ADMIN:${member.id}`
              }
            ]
          },
        ]
      }]
    });

    if (message) discordElement.delete().catch(noop);
  },
};