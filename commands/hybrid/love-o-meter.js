import { ApplicationCommandType, ApplicationCommandOptionType, MessageFlags, ComponentType, SeparatorSpacingSize, ButtonStyle } from "discord.js";

import { getRandomRangeRound, isString, noop, ResolveMember } from "#modules/Utils";
import Emotes from '#modules/Emotes';

const cache = new Map();

function GetCachedAnswer(member1, member2, color = "red", size = 512, animated = false) {
  const cacheKey = [member1.id, member2.id].sort().join(':');

  const data = cache.get(cacheKey) ?? { 
    key: cacheKey, member1, member2 
  };

  if (!data.percent) {
    if (member1.id === member2.id) data.percent = 100;
    else {
      const roll1 = getRandomRangeRound(0, 100);
      const roll2 = getRandomRangeRound(0, 100);

      data.percent = Math.abs(roll1 - roll2) > 50
        ? Math.max(roll1, roll2)
        : Math.min(roll1, roll2);
    }
  };

  data.url = `https://vps.wolphwood.ovh:1212/love-o-meter/normal/image.${animated ? 'gif' : 'png'}?size=${size}&color=${ color }&percent=${data.percent}`;

  if (data.timeout) clearTimeout(data.timeout);
  data.timeout = setTimeout(() => cache.delete(cacheKey), 3600 * 1000);

  cache.set(cacheKey, data);

  return data;
}

export const loveMessages = [
  {
    check: (p) => p === 0,
    contents: [
      "Le vide absolu. Même un frigo débranché dans une cave en hiver est plus chaleureux que ça.",
      "Le néant total. On est sur un désert de glace sur Pluton, et encore, Pluton est plus accueillante.",
      "0%... L'air entre vous vient de se transformer en azote liquide. Ne bougez plus, vous pourriez vous briser.",
      "Même deux aimants du même pôle se rejettent avec moins de force que votre duo.",
      "C'est mathématiquement fascinant : il est impossible d'être moins compatibles sans créer une faille spatio-temporelle."
    ]
  },
  {
    check: (p) => p <= 5,
    contents: [
      "C'est un non catégorique. L'air entre vous vient de geler instantanément, prévoyez un brise-glace.",
      "On frôle le zéro absolu. À ce stade, mieux vaut rester de parfaits inconnus pour le bien de l'humanité.",
      "Il y a un froid polaire entre vous. Sortez les doudounes, les moufles et surtout, changez de trottoir.",
      "C'est le désert sentimental le plus aride de l'histoire, il n'y a même pas un cactus pour sauver les meubles.",
      "Même l'eau et l'huile finissent par se mélanger avec un mixeur. Vous ? Même pas avec un miracle."
    ]
  },
  {
    check: (p) => p <= 10,
    contents: [
      "Il y a plus d'alchimie entre une fourchette en métal et une prise électrique de 220 volts.",
      "Une connexion totalement inexistante. Le courant ne passe pas, le câble est coupé et la centrale est en panne.",
      "On est sur un encéphalogramme plat du sentiment. Le cœur est en mode avion, définitivement.",
      "C'est comme essayer d'allumer un feu de camp sous l'eau en plein milieu d'un ouragan. Bonne chance.",
      "On appelle ça poliment une 'incompatibilité d'humeur', mais la vérité c'est que c'est le calme plat."
    ]
  },
  {
    check: (p) => p <= 15,
    contents: [
      "C'est ce qu'on appelle être aux antipodes : l'un est au pôle Nord, l'autre est déjà sur Mars.",
      "La communication est... disons, inexistante. On dirait un dialogue entre un chat et un grille-pain.",
      "Il faudrait un miracle divin (ou un bug majeur dans mon code) pour réussir à monter plus haut.",
      "Vous vous croisez sans vous voir, comme deux navires dans la brume qui ont oublié d'allumer leurs phares.",
      "L'ambiance est plus lourde qu'une mise à jour Windows de 50 Go avec une connexion ADSL de 1998."
    ]
  },
  {
    check: (p) => p <= 20,
    contents: [
      "On est sur une amitié... très, très lointaine. Genre, dans une autre galaxie, derrière un trou noir.",
      "Il y a un léger signal, mais c'est probablement juste un parasite radio ou un voisin qui utilise son micro-ondes.",
      "C'est le début du 'peut-être', mais soyons honnêtes, c'est surtout le gros début du 'sûrement pas'.",
      "Vous avez au moins un point commun : vous êtes sur le même serveur. C'est déjà une victoire en soi.",
      "C'est un petit pas pour l'homme, mais un surplace total pour l'amour. On ne va pas se mentir."
    ]
  },
  {
    check: (p) => p <= 25,
    contents: [
      "Une entente extrêmement timide. On va dire que vous vous tolérez si la pièce est assez grande.",
      "C'est un début, mais il va falloir ramer très fort, idéalement avec un moteur hors-bord de 200 chevaux.",
      "L'étincelle tente désespérément de naître, mais elle manque cruellement d'oxygène et de motivation.",
      "On est officiellement dans la 'Neutral Zone'. Ni guerre, ni paix, juste un grand silence gêné.",
      "Un petit espoir ? Peut-être dans un univers parallèle où les lois de la physique sont différentes."
    ]
  },
  {
    check: (p) => p <= 30,
    contents: [
      "C'est un bon début pour devenir des connaissances qui se disent 'salut' de la main en évitant le regard.",
      "On va dire que vous pourriez partager un ascenseur pendant trois étages sans avoir envie de sauter par la trappe.",
      "C'est la politesse avant tout. Un 'bonjour, merci, au revoir' bien calibré, mais rien de plus.",
      "On commence doucement à sortir du froid, mais gardez quand même vos vestes et vos bonnets.",
      "C'est une relation stable et excitante comme un lundi matin sous la pluie devant une machine à café en panne."
    ]
  },
  {
    check: (p) => p <= 35,
    contents: [
      "L'étincelle était là, mais quelqu'un a marché dessus avec des bottes de sécurité.",
      "On commence à sortir de la zone glaciaire, on aperçoit enfin quelques brins d'herbe sous la neige.",
      "C'est le début d'une amitié sympa, mais ne prévoyez pas de bague ou de plan sur la comète pour l'instant.",
      "Il y a un potentiel caché, quelque part entre la timidité et le désintérêt total. Très bien caché.",
      "Ça pourrait être franchement pire : vous pourriez vous détester cordialement. Là, c'est juste neutre."
    ]
  },
  {
    check: (p) => p <= 40,
    contents: [
      "Il y a un petit quelque chose, mais c'est peut-être juste la chaleur du processeur du bot qui vous induit en erreur.",
      "Une entente cordiale et polie, mais pas encore de quoi sauter au plafond ou écrire un poème.",
      "On est sur une base solide de 'on s'aime bien mais on ne sait plus trop pourquoi'.",
      "Le thermomètre monte d'un millimètre. On y croit ? Un tout petit peu alors, pour vous faire plaisir.",
      "C'est tiède. Ni chaud, ni froid. Un entre-deux parfait, un peu comme un verre d'eau à température ambiante."
    ]
  },
  {
    check: (p) => p <= 45,
    contents: [
      "La zone de confort absolue. Pas de grande passion, mais pas de bagarre pour la télécommande non plus.",
      "L'amitié est plutôt solide, mais le département 'Romance' est encore en plein travaux de rénovation.",
      "On s'approche doucement de la moyenne ! C'est déjà une belle étape de franchie.",
      "On rigole bien ensemble, les vannes fusent, et c'est déjà un excellent début pour construire quelque chose.",
      "Une belle complicité en devenir. C'est comme une pâte à pizza : il faut la laisser reposer un peu."
    ]
  },
  {
    check: (p) => p === 50,
    contents: [
      "50/50. L'équilibre parfait entre le 'on reste potes' et le 'on tente un truc'. La pièce est en l'air !",
      "La neutralité absolue. Vous êtes le point d'équilibre parfait du Love-O-Meter."
    ]
  },
  {
    check: (p) => p <= 50,
    contents: [
      "Le milieu du gué. Un simple pile ou face ou un message envoyé au bon moment pourrait tout changer.",
      "La moitié du chemin est faite. La question est : qui osera faire le premier pas pour la seconde moitié ?",
      "C'est pile la moyenne. Ni décevant, ni transcendant. Un bon score de sécurité.",
      "On est exactement à la frontière de la Friendzone. Un faux pas et c'est le ravin (ou le bonheur)."
    ]
  },
  {
    check: (p) => p <= 55,
    contents: [
      "Ça commence à chauffer doucement... un peu comme un café oublié sur le bureau qu'on trouve encore bon.",
      "Une petite chaleur s'installe. Rien de brûlant, mais c'est suffisant pour ne plus avoir froid.",
      "L'attirance pointe timidement le bout de son nez derrière la porte de l'amitié.",
      "C'est typiquement le moment où on commence à se poser des questions un peu bêtes le soir.",
      "Un petit 'plus' vient de s'ajouter discrètement dans l'équation. Le résultat devient intéressant."
    ]
  },
  {
    check: (p) => p <= 60,
    contents: [
      "On dépasse enfin le stade des simples potes. Attention où vous mettez les pieds, c'est glissant !",
      "Le courant commence à devenir alternatif. Ça bouge, ça vibre, on sent qu'il se passe un truc.",
      "L'intérêt mutuel est flagrant. Même les aveugles commencent à s'en rendre compte dans le chat.",
      "On entre dans la zone intéressante. Les papillons dans le ventre commencent leur échauffement.",
      "Il y a de la magie dans l'air, mais il faut encore farmer un peu de mana pour lancer le sort final."
    ]
  },
  {
    check: (p) => p <= 65,
    contents: [
      "Il y a des regards (ou des emojis) qui ne trompent pas. Ou alors c'est juste de la poussière sur l'écran.",
      "La complicité est indéniable. On se rapproche du but à grands pas, ne vous arrêtez pas là !",
      "Vous commencez à finir les phrases l'un de l'autre... ou à poster le même GIF au même moment.",
      "C'est clairement plus que de l'amitié, c'est une connexion réelle qui commence à peser lourd.",
      "On commence à capter sur la même fréquence radio. Le son est clair, le message est reçu."
    ]
  },
  {
    check: (p) => p <= 70,
    contents: [
      "L'ambiance est électrique ! Quelqu'un a activé le chauffage à fond ou c'est juste vous ?",
      "Une tension palpable. On n'est plus très loin du coup de foudre qui fait sauter les plombs.",
      "Le Love-O-Meter commence à vibrer sérieusement sur mon bureau. Ça chauffe par ici !",
      "Vous avez un truc spécial, c'est indéniable. Même les algorithmes sont un peu jaloux.",
      "On sort les violons pour l'ambiance, mais on attend encore un peu avant de lancer le grand orchestre."
    ]
  },
  {
    check: (p) => p <= 75,
    contents: [
      "C'est du sérieux là. On commence à regarder les menus du mariage ou on attend la semaine prochaine ?",
      "La connexion est profonde. On commence à parler le même langage codé que personne d'autre ne comprend.",
      "Une entente exceptionnelle. On dirait que vous avez été créés avec le même code source.",
      "C'est le moment idéal pour se lancer et dire les choses, avant que le serveur ne crash de bonheur.",
      "L'alchimie fait son travail en silence. C'est beau, c'est propre, c'est efficace."
    ]
  },
  {
    check: (p) => p <= 80,
    contents: [
      "Coup de foudre en approche immédiate. Les compteurs s'affolent et les voyants passent au rouge !",
      "Une alchimie puissante. Vous brillez tellement quand vous êtes ensemble qu'il faut des lunettes de soleil.",
      "C'est une évidence pour tout le monde sur ce serveur, sauf peut-être pour vous deux.",
      "La température grimpe en flèche ! On a dépassé le stade du 'mignon', on est dans le 'waouh'.",
      "Vous êtes officiellement le duo préféré des spectateurs. On attend la suite avec impatience."
    ]
  },
  {
    check: (p) => p <= 85,
    contents: [
      "C'est chaud, c'est beau, c'est presque indécent. On frôle l'incendie de forêt sentimental.",
      "Une passion dévorante. Les pompiers du Love-O-Meter sont en alerte maximale !",
      "C'est l'étape juste avant l'explosion de cœurs et de paillettes. Accrochez-vous !",
      "Votre duo est plus iconique et inséparable que le pain et le beurre demi-sel.",
      "Le Love-O-Meter a besoin d'un nouveau système de refroidissement à l'azote, ça fume !"
    ]
  },
  {
    check: (p) => p <= 90,
    contents: [
      "Destins liés. Vous êtes les deux pièces d'un même puzzle qui se cherchaient depuis le Big Bang.",
      "Une harmonie parfaite. On dirait que votre rencontre était écrite dans le code source de l'univers.",
      "C'est une connexion rare, presque mystique. On frise le surnaturel là, non ?",
      "Vous êtes officiellement l'un des meilleurs matchs jamais enregistrés par mes circuits.",
      "L'univers tout entier semble avoir conspiré pour que vous cliquiez sur ce bouton en même temps."
    ]
  },
  {
    check: (p) => p <= 95,
    contents: [
      "Âmes sœurs confirmées. Le Love-O-Meter est littéralement en train de fumer sur l'étagère.",
      "Fusion imminente ! C'est mathématique et physique : vous êtes faits l'un pour l'autre, point barre.",
      "On approche de la perfection sentimentale absolue. C'est presque intimidant pour les autres.",
      "Vous êtes le 'Couple Goal' par excellence, celui qui rend tout le monde un peu jaloux et très admiratif.",
      "Préparez le riz, les fleurs et les invitations, parce qu'à ce niveau-là, c'est du gâchis d'attendre."
    ]
  },
  {
    check: (p) => p <= 99,
    contents: [
      "L'amour avec un grand A. C'est tellement mignon que ça devrait être interdit par la loi.",
      "On frôle la perfection absolue. Un duo légendaire qui restera gravé dans les logs du serveur.",
      "Même les plus grands poètes n'auraient pas pu inventer une telle compatibilité. C'est époustouflant.",
      "C'est l'osmose totale. Plus rien ne peut vous arrêter, vous êtes en mode invincible.",
      "C'est presque effrayant d'être aussi compatibles. Vous êtes sûrs que vous n'êtes pas des clones ?"
    ]
  },
  {
    check: (p) => p === 100,
    contents: [
      "L'apothéose. Même les films Disney n'auraient pas osé un tel scénario. Mariage immédiat, pas d'excuse !",
      "Le score ultime. Deux corps, une seule âme, et un seul cerveau (pour le meilleur et pour le pire).",
      "100%. Le compteur a littéralement explosé. La légende commence ici, sous nos yeux ébahis.",
      "L'alignement des planètes est total, la prophétie s'est accomplie : vous êtes la perfection même.",
      "Le Love-O-Meter vient de s'auto-détruire pour se transformer en bague de fiançailles. Félicitations !"
    ]
  }
];

const AllowedColors = [
  { name: "Rouge", value: "red" },
  { name: "Bleu", value: "blue" },
  { name: "Vert", value: "green" },
  { name: "Or", value: "gold" },
  { name: "Rose", value: "pink" },
  { name: "Ingigo", value: "ingigo" },
  { name: "Violet Royal", value: "purple" },
  { name: "Orange Flamboyant", value: "orange" },
  { name: "Cyan Arctique", value: "cyan" },
  { name: "Blanc Pur", value: "white" },
  { name: "Noir Profond", value: "black" },
];

const AllowedSize = [
  { name: "Big", value: "512" },
  { name: "Medium", value: "256" },
  { name: "Smoll", value: "128" },
  { name: "Tiny", value: "64" },
  { name: "???", value: "32" },
];

export default {
  name: "love-o-meter",
  localeKey: "lovemeter",
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
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "color",
        description: "Couleur de l'image",
        required: false,
        choices: AllowedColors
      },
      {
        type: ApplicationCommandOptionType.String,
        name: "size",
        description: "Taille de l'image",
        required: false,
        choices: AllowedSize
      },
      {
        type: ApplicationCommandOptionType.Boolean,
        name: "animated",
        description: "Activer l'animation ?",
        required: false
      },
    ],
  },
  run: async ({ client, interaction, message, args, GuildData, UserData, LangToUse }) => {
    const discordElement = interaction || message;
    const member = discordElement.member;

    if (interaction) await interaction.deferReply();

    let member1;
    let member2;
    let color = "red";
    let animated = false;
    let size = "512";

    if (interaction) {
      member1 = args.find(a => a.name === "user1").member;
      member2 = args.find(a => a.name === "user2").member;

      color = interaction.options.getString('color') ?? 'red';
      animated = interaction.options.getBoolean('animated') ?? false;
      size = interaction.options.getString('size') ?? (animated ? '128' : '512');
    } else {
      member1 = await ResolveMember(message.guild, args[0]);
      member2 = await ResolveMember(message.guild, args[1]);

      for (let arg of args.slice(2)) {
        let foundSize = AllowedSize.find(size => size.name.toLocaleLowerCase() == arg.toLowerCase() || size.value == arg.toLowerCase());
        console.log(foundSize)

        if (['true','false','animated'].includes(arg.toLowerCase())) {
          animated = ['true','animated'].includes(arg.toLowerCase());
        } else
        if (foundSize) {
          size = foundSize.value;
        } else {
          color = arg.toLowerCase().replace(/(\#|0x)/gi, "%23");
        }
      }
    }

    if (!member1 || !member2) return await discordElement.reply([
      `${Emotes.crossmark} Utilisateur·ice non trouvé·e...`,
      !member1 && `- \`${args[0]}\` ne correspond à aucun utilisateur.`,
      !member2 && `- \`${args[1]}\` ne correspond à aucun utilisateur.`,
    ].filter(isString).join('\n'));

    const data = GetCachedAnswer(member1, member2, color, size, animated);

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
              member1.id === member2.id ? `### C'est important de s'aimer soit-même <3` : '### ' + loveMessages.find(m => m.check(data.percent)).contents.getRandomElement()
            ].join('\n')
          },
          {
            type: ComponentType.MediaGallery,
            items: [{
              media: { url: data.url + `&bust-cache=${Date.timestamp()}` }
            }]
          },
          {
            type: ComponentType.TextDisplay,
            content: `-# Question posée par ${member}[.](${data.url})`
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