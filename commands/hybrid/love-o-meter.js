import { ApplicationCommandType, ApplicationCommandOptionType, MessageFlags, ComponentType, SeparatorSpacingSize, ButtonStyle } from "discord.js";

import fs from 'fs';
import path from 'path';

import { DiscordMenu, getRandomRangeRound, ModalForm, noop, ResolveMember } from "#modules/Utils";
import Emotes from '#modules/Emotes';

const cache = new Map();

function GetCachedAnswer(member1, member2) {
  const cacheKey = [member1.id, member2.id].sort().join(':');

  const data = cache.get(cacheKey) ?? { 
    key: cacheKey, member1, member2 
  };

  if (!data.value) {
    if (member1.id === member2.id) data.value = 100;
    else {
      const roll1 = getRandomRangeRound(0, 100);
      const roll2 = getRandomRangeRound(0, 100);

      data.value = Math.abs(roll1 - roll2) > 50
        ? Math.max(roll1, roll2)
        : Math.min(roll1, roll2);
    }
  };

  data.url = `https://vps.wolphwood.ovh:1212/love-o-meter/normal/image.gif?size=512&color=red&percent=${data.value}`;

  if (data.timeout) clearTimeout(data.timeout);
  data.timeout = setTimeout(() => cache.delete(cacheKey), 3600 * 1000);

  cache.set(cacheKey, data);

  return data;
}

export const loveMessages = [
  {
    check: (p) => p === 0,
    contents: [
      "Le vide absolu. Même un frigo est plus chaleureux que ça.",
      "Le néant total. Un désert de glace est plus accueillant.",
      "0%... L'air entre vous vient de se transformer en azote liquide.",
      "Même deux aimants du même pôle se rejettent moins que vous.",
      "C'est mathématiquement impossible d'être moins compatibles."
    ]
  },
  {
    check: (p) => p <= 5,
    contents: [
      "C'est un non catégorique. L'air entre vous vient de geler.",
      "On frôle le zéro absolu. Mieux vaut rester de parfaits inconnus.",
      "Il y a un froid polaire. Sortez les doudounes.",
      "C'est le désert sentimental, pas un brin d'herbe à l'horizon.",
      "Même l'eau et l'huile se mélangent mieux que vous."
    ]
  },
  {
    check: (p) => p <= 10,
    contents: [
      "Il y a plus d'alchimie entre une fourchette et une prise électrique.",
      "Une connexion inexistante. Le courant ne passe vraiment pas.",
      "On est sur un encéphalogramme plat du sentiment.",
      "C'est comme essayer d'allumer un feu sous l'eau.",
      "On appelle ça poliment une 'incompatibilité d'humeur'."
    ]
  },
  {
    check: (p) => p <= 15,
    contents: [
      "C'est ce qu'on appelle être aux antipodes.",
      "La communication est... disons, compliquée.",
      "Il faudrait un miracle (ou un bug) pour monter plus haut.",
      "Vous vous croisez sans vous voir, comme deux navires dans la brume.",
      "L'ambiance est plus lourde qu'une mise à jour Windows de 50 Go."
    ]
  },
  {
    check: (p) => p <= 20,
    contents: [
      "On est sur une amitié... très, très lointaine. Genre, dans une autre galaxie.",
      "Il y a un léger signal, mais c'est probablement un parasite radio.",
      "C'est le début du 'peut-être', mais c'est surtout le début du 'non'.",
      "Vous avez au moins un point commun : vous êtes sur le même serveur.",
      "C'est un petit pas pour l'homme, mais un surplace pour l'amour."
    ]
  },
  {
    check: (p) => p <= 25,
    contents: [
      "Une entente très timide. On va dire que vous vous tolérez.",
      "C'est un début, mais il va falloir ramer très fort.",
      "L'étincelle tente de naître, mais elle manque d'oxygène.",
      "On est dans la 'Neutral Zone'. Ni guerre, ni paix.",
      "Un petit espoir ? Peut-être. Mais vraiment petit."
    ]
  },
  {
    check: (p) => p <= 30,
    contents: [
      "C'est un bon début pour devenir des connaissances qui se disent 'salut' de la main.",
      "On va dire que vous pourriez partager un ascenseur sans vous battre.",
      "C'est la politesse avant tout. Rien de plus, rien de moins.",
      "On commence à sortir du froid, mais gardez quand même vos vestes.",
      "C'est une relation stable, comme un lundi matin."
    ]
  },
  {
    check: (p) => p <= 35,
    contents: [
      "L'étincelle est là, mais quelqu'un a marché dessus.",
      "On commence à sortir de la zone glaciaire.",
      "C'est le début d'une amitié sympa, mais ne prévoyez pas de bague.",
      "Il y a un potentiel caché. Très bien caché.",
      "Ça pourrait être pire, vous pourriez vous détester."
    ]
  },
  {
    check: (p) => p <= 40,
    contents: [
      "Il y a un petit quelque chose, mais c'est peut-être juste de la politesse.",
      "Une entente cordiale, mais pas de quoi sauter au plafond.",
      "On est sur une base solide de 'on s'aime bien'.",
      "Le thermomètre monte d'un millimètre. On y croit ?",
      "C'est tiède. Ni chaud, ni froid. Un entre-deux parfait."
    ]
  },
  {
    check: (p) => p <= 45,
    contents: [
      "La zone de confort. Pas de passion, mais pas de bagarre non plus.",
      "L'amitié est solide, mais le reste est encore en travaux.",
      "On s'approche de la moyenne ! C'est déjà ça.",
      "On rigole bien ensemble, et c'est déjà un excellent début.",
      "Une belle complicité en devenir."
    ]
  },
  {
    check: (p) => p <= 50,
    contents: [
      "Le milieu du gué. Un pile ou face pourrait tout changer.",
      "50/50. L'équilibre parfait entre le 'peut-être' et le 'sûrement'.",
      "La moitié du chemin est faite. Qui fera le premier pas pour la suite ?",
      "C'est pile la moyenne. Ni décevant, ni transcendant.",
      "On est exactement à la frontière de la Friendzone."
    ]
  },
  {
    check: (p) => p <= 55,
    contents: [
      "Ça commence à chauffer doucement... comme un café oublié sur le bureau.",
      "Une petite chaleur s'installe. À surveiller de près.",
      "L'attirance pointe le bout de son nez.",
      "C'est le moment où on commence à se poser des questions.",
      "Un petit 'plus' vient d'apparaître dans l'équation."
    ]
  },
  {
    check: (p) => p <= 60,
    contents: [
      "On dépasse le stade des simples potes. Attention où vous mettez les pieds !",
      "Le courant commence à devenir alternatif. Ça bouge !",
      "L'intérêt mutuel est flagrant. On ne peut plus le nier.",
      "On entre dans la zone intéressante. Les papillons s'échauffent.",
      "Il y a de la magie dans l'air, mais il faut encore un peu de mana."
    ]
  },
  {
    check: (p) => p <= 65,
    contents: [
      "Il y a des regards qui ne trompent pas. Ou alors c'est de la poussière dans l'œil.",
      "La complicité est indéniable. On se rapproche du but.",
      "Vous commencez à finir les phrases l'un de l'autre.",
      "C'est plus que de l'amitié, c'est une connexion réelle.",
      "On commence à parler la même fréquence."
    ]
  },
  {
    check: (p) => p <= 70,
    contents: [
      "L'ambiance est électrique ! Quelqu'un a activé le chauffage ?",
      "Une tension palpable. On n'est plus très loin du coup de foudre.",
      "Le Love-O-Meter commence à vibrer sérieusement.",
      "Vous avez un truc spécial, c'est indéniable.",
      "On sort les violons, mais juste pour l'accordage."
    ]
  },
  {
    check: (p) => p <= 75,
    contents: [
      "C'est du sérieux. On commence à regarder les menus de mariage ?",
      "La connexion est profonde. On commence à parler le même langage.",
      "Une entente exceptionnelle. On dirait que vous vous connaissez depuis toujours.",
      "C'est le moment de se lancer, non ?",
      "L'alchimie fait son travail. C'est beau à voir."
    ]
  },
  {
    check: (p) => p <= 80,
    contents: [
      "Coup de foudre en approche. Les compteurs s'affolent !",
      "Une alchimie puissante. Vous brillez quand vous êtes ensemble.",
      "C'est une évidence pour tout le monde sauf peut-être pour vous.",
      "La température grimpe en flèche !",
      "Vous êtes le duo préféré du serveur."
    ]
  },
  {
    check: (p) => p <= 85,
    contents: [
      "C'est chaud, c'est beau, c'est presque trop. On frôle l'incendie.",
      "Une passion dévorante. Les pompiers sont en route !",
      "C'est l'étape juste avant l'explosion de coeur.",
      "Votre duo est plus iconique que le pain et le beurre.",
      "Le Love-O-Meter a besoin d'un nouveau système de refroidissement."
    ]
  },
  {
    check: (p) => p <= 90,
    contents: [
      "Destins liés. Vous êtes les deux pièces d'un même puzzle.",
      "Une harmonie parfaite. On dirait que c'était écrit.",
      "C'est une connexion rare, presque mystique.",
      "Vous êtes officiellement l'un des meilleurs matchs possibles.",
      "L'univers semble avoir conspiré pour vous réunir."
    ]
  },
  {
    check: (p) => p <= 95,
    contents: [
      "Âmes sœurs confirmées. Le Love-O-Meter est en train de fumer.",
      "Fusion imminente ! C'est mathématique : vous êtes faits l'un pour l'autre.",
      "On approche de la perfection sentimentale.",
      "Vous êtes le 'Couple Goal' par excellence.",
      "Préparez le riz pour le mariage, c'est pour bientôt."
    ]
  },
  {
    check: (p) => p <= 99,
    contents: [
      "L'amour avec un grand A. C'est indécent tellement c'est mignon.",
      "On frôle la perfection absolue. Un duo légendaire.",
      "Même les poètes n'auraient pas pu inventer ça.",
      "C'est l'osmose totale. Rien ne peut vous arrêter.",
      "C'est presque effrayant d'être aussi compatibles !"
    ]
  },
  {
    check: (p) => p === 100,
    contents: [
      "L'apothéose. Même les films Disney n'auraient pas osé. Mariage immédiat !",
      "Le score ultime. Deux corps, une seule âme. Épousez-vous !",
      "100%. Le compteur a explosé. La légende commence ici.",
      "L'alignement des planètes est total. Vous êtes la perfection même.",
      "Le Love-O-Meter vient de se transformer en bague de fiançailles."
    ]
  }
];

export default {
  name: "love-o-meter",
  aliases: ["love"],
  category: "fun",
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.User,
        name: "user1",
        description: "Utilisateur·ice #1",
        required: true
      },
      {
        type: ApplicationCommandOptionType.User,
        name: "user2",
        description: "Utilisateur·ice #2",
        required: true
      }
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    const discordElement = interaction || message;
    const member = discordElement.member;

    if (interaction) await interaction.deferReply();

    let member1;
    let member2;

    if (interaction) {
      member1 = args.find(a => a.name === "user1").member;
      member2 = args.find(a => a.name === "user2").member;
    } else {
      member1 = await ResolveMember(message.guild, args[0]);
      member2 = await ResolveMember(message.guild, args[1]);
    }

    if (!member1 || !member2) return await discordElement.reply([
      `${Emotes.crossmark} Utilisateur·ice non trouvé·e...`,
      !member1 && `- \`${args[0]}\` ne correspond à aucun utilisateur.`,
      !member2 && `- \`${args[1]}\` ne correspond à aucun utilisateur.`,
    ].filter(isString).join('\n'));

    const data = GetCachedAnswer(member1, member2);

    let waitmessage;
    if (message) waitmessage = await message.channel.send(`# ${Emotes.loading} ${member}`);

    try {
      await fetch(data.url, { mode: 'no-cors' });
    } catch (err) {};

    const payload = {
      flags: [ MessageFlags.IsComponentsV2 ],
      allowedMentions: { users: [], repliedUser: true },
      components: [{
        type: ComponentType.Container,
        accent_color: 0xFFADAD,
        components: [
          {
            type: ComponentType.TextDisplay,
            content: [
              `# ${member1} × ${member2}`,
              member1.id === member2.id ? `C'est important de s'aimer soit-même <3` : loveMessages.find(m => m.check(data.value)).contents.getRandomElement()
            ].join('\n')
          },
          {
            type: ComponentType.MediaGallery,
            items: [{
              media: { url: data.url }
            }]
          },
          {
            type: ComponentType.TextDisplay,
            content: `-# Question posée par ${member}`
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
                customId: `DELETE:GUILD_ADMIN:${[member.id, member1.id, member2.id].unique().join('_')}`
              }
            ]
          },
        ]
      }]
    };
    
    if (interaction) {
      interaction.editReply(payload);
    } else
    if (message) {
      message.reply(payload);
    }

    if (message) {
      waitmessage.delete().catch(noop);
      discordElement.delete().catch(noop);
    }
  },
};