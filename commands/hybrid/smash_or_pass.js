const { ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, EmbedBuilder, AttachmentBuilder, TextInputStyle, Guild, ThreadManager, Utils, TextInputBuilder, Message } = require("discord.js");
const client = require("../../app");
const fs = require('fs');
const sharp = require('sharp');
const { BotError } = require("../../modules/Errors");
const { noop } = require("../../modules/functions/Utils");
const { log } = require("console");
const { description } = require("./server_config");

let CONFIG_MENU_OPEN = [];

const NoOutfitDefaultImage = "https://media.discordapp.net/attachments/605515103835521054/1317166160818602098/800px-No-Image-Placeholder.png";

function ExtractUrlsFromContent(element) {
    return element.content.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/gi) ?? [];
}

function ExtractUrlsFromAttachments(element) {
    return element.attachments.values().array().flatMap(e => {
        return e.contentType.startsWith('image/') ? e.proxyURL : null
    }).filter(e => e !== null);
}

const CachedAttachments = new Map();
function GetAttachment(outfit) {
    if (outfit.base64) {
        if (CachedAttachments.has(outfit._id)) {
            return CachedAttachments.get(outfit._id);
        } else {
            let attachment = Base64ToAttachment(outfit.base64);
            CachedAttachments.set(outfit._id, attachment);
            return attachment;
        }
    } else {
        return null;
    }
}

function Base64ToAttachment(base64String, filename = 'image') {
    try {
        // Vérifier que la chaîne est au bon format (data:image/png;base64,...)
        const match = base64String.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!match) {
            throw new Error('Format de chaîne Base64 invalide.');
        }

        // Extraire le type MIME et les données Base64
        const mimeType = match[1]; // Ex: "image/png"
        const data = match[2]; // Contient les données Base64

        // Déterminer l'extension à partir du type MIME
        const extension = mimeType.split('/')[1]; // Ex: "png"

        // Convertir les données en Buffer
        const buffer = Buffer.from(data, 'base64');

        // Créer et retourner l'attachement
        return new AttachmentBuilder(buffer, { name: `${filename}.${extension}` });
    } catch (error) {
        console.error('Erreur lors de la conversion Base64 en attachement :', error.message);
        return null;
    }
}

async function convertUrlToBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur lors du téléchargement : ${response.statusText} (code ${response.status})`);
        }

        // Obtenez le type MIME pour construire la chaîne Base64
        const mimeType = response.headers.get('content-type'); // Exemple : "image/png"
        if (!mimeType || !mimeType.startsWith('image/')) {
            throw new Error('Le contenu téléchargé n\'est pas une image valide.');
        }
        

        // Utilisez arrayBuffer pour lire les données binaires
        const arrayBuffer = await response.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        const metadata = await sharp(buffer).metadata();

        const maxSize = 0.5 * 1024 * 1024; // 0.5 Mo en octets
        if (metadata.size > maxSize) {
            const factor = maxSize / metadata.size;
            
            if (metadata.width > metadata.height) {
                buffer = await sharp(buffer).resize({ width: Math.round(metadata.width * factor) }).toBuffer();
            } else {
                buffer = await sharp(buffer).resize({ height: Math.round(metadata.height * factor) }).toBuffer();
            }
        }

        // Convertissez le buffer en Base64
        const base64Data = buffer.toString('base64');
        const base64String = `data:${mimeType};base64,${base64Data}`;

        // Retournez la chaîne en Base64
        return base64String;
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

function FillString(str, len = 256) {
    return (str + ` \u200b`.repeat(len/2)).slice(0,len);
}

module.exports = {
    name: "SmashOrPass",
    aliases: ['sop'],
    userPermission: client.PERMISSION.USER,
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "config",
            aliases: ['c', 'conf', 'cfg'],
            description: Locale.get(`commandinfo.smashorpass.option.config.description`),
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "start",
            description: Locale.get(`commandinfo.smashorpass.option.start.description`),
        },
    ],
    run: async ({client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
        let discordElement = message ?? interaction;
        let { member } = discordElement;

        let subcommand = args.shift();
        if (!subcommand) subcommand = "start";

        switch (subcommand.toLowerCase().simplify()) {
            case "start":
                await GameSmashOrPass({ discordElement, GuildData, UserData });
                if (message) message.delete().catch(noop);
            break
            
            case "config":
            case "conf":
            case "cfg":
            case "c":
                if (userPermissionLevel < client.PERMISSION.GUILD_MOD) {
                    return discordElement.reply({
                        content:  Emotes.cancel +  ` You haven't permission for that`,
                        ephemeral: true,
                    }).then(e => !e.ephemeral ? Wait(3000).then(() => e.delete()) : null);
                }

                await ConfigCharacters({ discordElement, GuildData, UserData });

                if (discordElement instanceof Message) {
                    message.delete().catch(noop);
                }
            break

            default:
                discordElement.reply({ content: `Unknown sub-command '${subcommand}'` });
            
        }
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;

const softFixed = (value) => {
    let fixed = Math.round(value * 100) / 100;
    return isNaN(fixed) ? isNaN(value) ? 0 : value : fixed;
}

function SortByName(a,b) {
    const kA = `${a.name} ${a.arc}`.simplify().toLowerCase();
    const kB = `${b.name} ${b.arc}`.simplify().toLowerCase();
    
    if (kA < kB) return -1;
    if (kA > kB) return 1;
    return 0;
}

function SortByRatio(a,b) {
    let rA = softFixed((a.stats.smashed - a.stats.passed) / (a.stats.smashed + a.stats.passed));
    let rB = softFixed((b.stats.smashed - b.stats.passed) / (b.stats.smashed + b.stats.passed));

    if (rA > rB) return -1;
    if (rA < rB) return 1;
    return 0;
}

async function GameSmashOrPass({ discordElement, GuildData, UserData }) {
    let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
    let AllCharacters = await Manager.SOP.getAll(GuildData.id);
    loadingEmoteMessage.delete().catch(noop);

    const MenuGameSmashOrPass = new DiscordMenu({
        element: discordElement,
        ephemeral: true,
        collectorOptions: {
            idle: 2_147_483_647
        },
        onEnd: function() {
            if (!this.deleteOnClose) {
                this.message.edit({
                    embeds: this.message.embeds,
                    components: [],
                });
                this.message.react('🔒');
            }
        },
        data: {
            characters: AllCharacters.sort(SortByName),
            gamemode: 'random',
            count: 0,
            ccount: false,
            _museum: {
                sorting: 'name',
                index: null,
            },
            _game: {
                characters: [],
                character: null,
                attachment: null,
                outfit: null,
                smashed: [],
                passed: [],
            }
        },
        pages: [
            {
                name: "home",
                embeds: function() {
                    return [{
                        title: "🥵\u2000\u2000𝗦\u2000𝗠\u2000𝗔\u2000𝗦\u2000𝗛\u2000\u2000𝗢\u2000𝗥\u2000\u2000𝗣\u2000𝗔\u2000𝗦\u2000𝗦\u2000\u2000🥶",
                        description: `Bienvenue à Voice Line City, où chaque personnage a sa voix, son histoire, et son style unique.\nDans ce jeu interactif hilarant, il ne s'agit pas de combat, mais de décisions!\nAffrontez un défilé de personnages hauts en couleur, chacun avec ses traits distinctifs, et répondez à la question fatidique : "Smash or Pass ?".`,
                        fields: [
                            {
                                name: "Personnages",
                                value: `Il existe ${this.data.characters.length} personnages !`,
                            }
                        ],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    return [
                        [
                            {
                                emoji: "▶",
                                label: Locale.get(`command.sop.home.button.label`),
                                style: ButtonStyle.Primary,
                                action: "goto:game-setup"
                            },
                            {
                                emoji: "🏛️",
                                label: Locale.get(`command.sop.museum.button.label`),
                                style: ButtonStyle.Primary,
                                action: "goto:museum-select"
                            },
                            {
                                emoji: "🥇",
                                label: Locale.get(`command.sop.tops.button.label`),
                                style: ButtonStyle.Primary,
                                action: "goto:tops"
                            },
                        ],
                        [
                            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
                        ]
                    ]
                }
            },

            {
                name: "tops",
                
                embeds: function() {
                    let SortedCharacters = this.data.characters.map(character => {
                        let {smashed, passed} = character.stats;
                        character.stats.ratio = softFixed((smashed - passed) / (smashed + passed));
                        character.stats.smashed_percent = softFixed((smashed * 100) / (smashed + passed));
                        character.stats.passed_percent = softFixed((passed * 100) / (smashed + passed));
                        
                        return character;
                    }).shuffle().sort(SortByRatio);

                    let TopSize = 3;
                    let MostPopularCharacters = SortedCharacters.slice(0,TopSize);
                    let MostUnpopularCharacters = SortedCharacters.slice(-TopSize).reverse();

                    return [
                        {
                            fields: [
                                {
                                    name: FillString(`Top ${TopSize} des personnages les plus plus célèbres !`),
                                    value: MostPopularCharacters.flatMap((c,i) => [`${['🥇','🥈','🥉'][i] ?? '🏅'} **${c.name} _(${c.arc})_**`, `- ${c.stats.smashed} Smash (${c.stats.smashed_percent}%)`, `- ${c.stats.passed} Pass (${c.stats.passed_percent}%)`, `- Ratio de ${c.stats.ratio}`, ``]).join('\n'),
                                },
                            ],
                            color: 0x5865F2,
                        },
                        {
                            fields: [
                                {
                                    name: FillString(`Top ${TopSize} des personnages les moins plus célèbres !`),
                                    value: MostUnpopularCharacters.flatMap((c,i) => [`${['🥇','🥈','🥉'][i] ?? '🏅'} **${c.name} _(${c.arc})_**`, `- ${c.stats.smashed} Smash (${c.stats.smashed_percent}%)`, `- ${c.stats.passed} Pass (${c.stats.passed_percent}%)`, `- Ratio de ${c.stats.ratio}`, ``]).join('\n'),
                                }
                            ],
                            color: 0xEF5858,
                        },
                        
                    ];
                },
                components: [[
                    { emoji: '🏠', label: "Home", action: "goto:home", style: ButtonStyle.Secondary },
                ]]
            },

            {
                name: "museum-select",
                beforeUpdate: function() {
                    let { selectpage } = this.data._museum ?? {};

                    this.data._museum.selectpage = selectpage ?? 0;
                },
                embeds: function() {
                    let CharactersPages = this.data.characters.chunkOf(25);
    
                    return [{
                        title: "Liste des personnages",
                        fields: [{
                            name: FillString('Personnages'),
                            value: CharactersPages[this.data._museum.selectpage].map((c,i) => `${(i + 1) + (this.data._museum.selectpage * 25)}. ${c.name} _(${c.arc})_`).join('\n'),
                        }],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let CharactersPages = this.data.characters.chunkOf(25);
                    let hasMultiplePages = CharactersPages.length > 1;

                    return [
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: Locale.get("command.sop.museum_select.select.placeholder"),
                                options: CharactersPages[this.data._museum.selectpage].map((character, index) => ({
                                    label: `[${(index + 1) + (this.data._museum.selectpage * 25)}] ${character.name} (${character.arc})`,
                                    value: character.uid,
                                    // default: this.data._museum.index !== null ? ( this.data.characters[this.data._museum.index]?.uid == character.uid ) : false
                                })),
                                action: function(interaction) {
                                    this.data._museum.index = this.data.characters.findIndex(char => char.uid == interaction.values[0]);
                                    this.data._museum.outfitindex = 0;
                                    this.goto('museum');
                                    return true;
                                },
                            }
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._museum.selectpage = Math.clamp((this.data._museum.selectpage || 0) - 1, 0, CharactersPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._museum.selectpage < 1
                            },
                            {
                                label: `${this.data._museum.selectpage + 1}/${CharactersPages.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._museum.selectpage ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._museum.selectpage = Math.clamp((this.data._museum.selectpage || 0) + 1, 0, CharactersPages.length - 1);
    
                                    return true;
                                },
                                style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._museum.selectpage = Math.clamp((this.data._museum.selectpage || 0) + 1, 0, CharactersPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._museum.selectpage >= (CharactersPages.length - 1) 
                            },
                        ],
                        ['name', 'popular', 'unpopular'].map(m => ({
                            label: Locale.get(`command.sop.museum.sorting.button.${m}.label`),
                            action: function() {
                                this.data._museum.sorting = m;
                                
                                if (m === 'name') {
                                    this.data.characters = this.data.characters.sort(SortByName);
                                } else
                                if (m === 'popular') {
                                    this.data.characters = this.data.characters.sort(SortByName).sort(SortByRatio);
                                } else
                                if (m === 'unpopular') {
                                    this.data.characters = this.data.characters.sort(SortByName).sort(SortByRatio).reverse();
                                }
                                
                                return true;
                            },
                            style: this.data._museum.sorting === m ? ButtonStyle.Primary : ButtonStyle.Secondary
                        })),
                        [
                            { emoji: '🏠', label: "Home", action: "goto:home", style: ButtonStyle.Secondary },
                        ]
                    ]
                }
            },
            {
                name: "museum",
                beforeUpdate: function() {
                    let character = this.data.characters[this.data._museum.index];
                    
                    if (!this.data._museum.epicCommentCache) {
                        this.data._museum.epicCommentCache = new Map();
                    }

                    this.data._museum.index = Math.clamp(
                        this.data._museum.index || 0,
                        0, this.data.characters.length - 1
                    );

                    this.data._museum.outfitindex = Math.clamp(
                        this.data._museum.outfitindex || 0,
                        0, character.outfits.length - 1
                    );

                    let outfit = character.outfits[this.data._museum.outfitindex] ?? { name: "_(No image available)_", url: NoOutfitDefaultImage };
    
                    this.data._museum.character = character;
                    this.data._museum.outfit = outfit;
    
                    this.data._museum.attachment = GetAttachment(outfit);
                },
                embeds: function() {
                    let { character, outfit, attachment } = this.data._museum;
                    let { smashed, passed } = character.stats;

                    if (isNaN(smashed)) smashed = 0;
                    if (isNaN(passed)) passed = 0;

                    let ratio = softFixed((smashed - passed) / (smashed + passed));
                    let smashed_percent = softFixed((smashed * 100) / (smashed + passed));
                    let passed_percent = softFixed((passed * 100) / (smashed + passed));
    
                    let columns = 1;
                    let cols = [];
                    let formated = character.outfits.map((o,i) => `${i+1}. ${i == this.data._museum.outfitindex ? Emotes.chevron.white.right.simple : Emotes.empty} ${o.name ?? '_Unknown Outfit Name_'}`);
                    do {
                        cols = formated.divide(++columns);
                    } while (cols.some(c => c.join('\n').length > 1024));

                    let comment = "Pas grand chose à dire...";

                    if (smashed == 0) comment = `${character.name} n’a encore fait succomber personne à ses charmes... 😔`;
                    if (passed >= smashed * 2) comment = `On dirait que ${character.name} est plus controversé(e) qu’une pizza à l’ananas 🍍`;
                    if (passed >= smashed * 3) comment = `Wow... même un cactus est plus abordable que ${character.name} 🌵`;
                    if (passed >= smashed * 4) comment = `${character.name} s’est fait ghoster plus souvent qu’un vieux compte Tinder 👻`;
                    if (passed >= smashed * 5) comment = `La Friendzone a clairement adopté ${character.name} 🛑💔`;

                    if (smashed == passed) comment = `${character.name} est un mystère ambulant... il/elle partage le monde en deux 🤔`;

                    if (passed == 0) comment = `${character.name} est l'incarnation du désir, personne ne lui résiste 💘`;
                    if (smashed >= passed * 2) comment = `${character.name} pourrait écrire un livre : "Comment séduire en 10 leçons" 📚`;
                    if (smashed >= passed * 3) comment = `${character.name} est tellement irrésistible que les Cupidons font des heures sup’ 💘`;
                    if (smashed >= passed * 4) comment = `La légende raconte que même les statues smashent ${character.name} 🗿❤️`;
                    if (smashed >= passed * 5) comment = `${character.name} est une tornade de séduction, rien ne lui résiste 🌪️🔥`;

                    if (smashed == 0 && passed == 0) comment = `${character.name} ? PTDR C KI ?`;
                    
                    if (ratio === 1) {
                        let comments = [
                            `Le cœur de ${character.name} est un royaume où personne n'ose entrer… à moins d'être prêt pour l'amour éternel 💍🔥.`,
                            `Tous les dieux de l'Olympe se sont mis à genoux devant ${character.name}. Même Aphrodite est jalouse 😱💘.`,
                            "Si l'amour était une arme de destruction massive, ${character.name} serait une bombe nucléaire prête à exploser 💣🔥.",
                            `${character.name} est tellement irrésistible que même la gravité tombe sous son charme... tout le monde tombe à ses pieds 🌍💥.`,
                            `Les anges eux-mêmes se battent pour avoir une chance avec ${character.name}... et ils ne sont même pas dignes 😇💖.`,
                            `Même l'univers entier a dû faire une pause pour admirer la beauté de ${character.name} ✨🌌.`
                        ];

                        if (!this.data._museum.epicCommentCache.has(character.uid)) {
                            comment = comments.getRandomElement();
                            this.data._museum.epicCommentCache.set(character.uid, comment);
                        } else {
                            comment = this.data._museum.epicCommentCache.get(character.uid);
                        }
                    }

                    if (ratio === -1) {
                        let comments = [
                            `Quand ${character.name} entre dans la pièce, même les murs prennent leurs distances 🧱❌.`,
                            `Si ${character.name} était une œuvre d'art, ce serait un tableau dans la section 'à éviter' du musée 🖼️🚫.`,
                            `Même un trou noir se détourne pour éviter l'ombre de ${character.name}. C'est dire à quel point c'est un abyssale désastre 🌑❌.`,
                            `Même les pires cauchemars semblent plus attrayants que de croiser ${character.name}… un véritable tourment 👻💔.`,
                            `Si ${character.name} était une chanson, ce serait celle qu'on oublie après une seconde d'écoute 🔊🚫.`,
                            `Quand ${character.name} entre dans une pièce, même les plantes se fanent de honte 🌿💀.`
                        ];

                        if (!this.data._museum.epicCommentCache.has(character.uid)) {
                            comment = comments.getRandomElement();
                            this.data._museum.epicCommentCache.set(character.uid, comment);
                        } else {
                            comment = this.data._museum.epicCommentCache.get(character.uid);
                        }
                    }
                    
                    outfitFields = cols.map((col, index) => {
                        return {
                            name: index == 0 ? 'Outfits' : '\u200b',
                            value: col.length > 0 ? col.join('\n') : '_(No image available)_',
                            inline: true
                        };
                    });

                    return [{
                        title: "Modification d'un personnage",
                        fields: [
                            {
                                name: FillString('Personnage', 32),
                                value: character.name ?? "John Doe",
                                inline: true
                            },
                            {
                                name: FillString('Arc', 32),
                                value: character.arc ?? "Narmol",
                                inline: true
                            },
                            {
                                name: 'Stats',
                                value: `- Smash ${smashed} fois. (${smashed_percent}%)\n- Pass ${passed} fois. (${passed_percent}%)\n- Ratio : ${ratio}\n${comment}`,
                                inline: false
                            },
                            ...outfitFields
                        ],
                        image: {
                            url: outfit.base64 ? `attachment://${attachment.name}` : outfit.url
                        },
                        color: 0x5865F2,
                    }];
                },
                files: function() {
                    let { attachment } = this.data._museum;
    
                    if (attachment) {
                        return [ attachment ];
                    } else {
                        return [];
                    }
                },
                components: function() {
                    let character = this.data.characters[this.data._museum.index];

                    this.data._museum.outfitindex = this.data._museum.outfitindex ?? 0;
                    this.data._museum.selectoutfitpage = this.data._museum.selectoutfitpage ?? 0;

                    let OutfitsPages = character.outfits.map((o,i) => `[${i+1}] ${o.name ?? '_Unknown Outfit Name_'}`).chunkOf(25);

                    let hasOutfits = character.outfits.length > 0;
                    let hasMultipleOutfits = character.outfits.length > 1;
                    let hasMultiplePageOutfits = OutfitsPages.length > 1;

                    const getCharacter = (character) => {
                        if (!character) return `Nobody`;
                        return `${character.name} (${character.arc})`;
                    }

                    return [
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: Locale.get("command.sop.museum.outfit_select.placeholder"),
                                options: (hasOutfits ? OutfitsPages[this.data._museum.selectoutfitpage] : ['(No outfit available)']).map((name, index) => ({
                                    label: name,
                                    value: '' + (index + (25 * this.data._museum.selectoutfitpage)),
                                    default: (!hasOutfits) || index === this.data._museum.outfitindex
                                })),
                                action: function(interaction) {
                                    let index = Number(interaction.values[0]);
                                    
                                    if (index === this.data._museum.outfitindex) return false;

                                    this.data._museum.outfitindex = index;
                                    return true;
                                },
                                disabled: !(hasOutfits && hasMultipleOutfits)
                            }
                        ],
                        [
                            {
                                // Prev Page
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._museum.selectoutfitpage -= 1;
                                    return true;
                                },
                                disabled: !(hasOutfits && hasMultiplePageOutfits && this.data._museum.selectoutfitpage > 0)
                            },
                            {
                                // Goto
                                label: `${(this.data._museum.selectoutfitpage || 0) + 1}/${OutfitsPages.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Voir une tenue spécifique", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de la tenue", placeholder: (this.data._museum.outfitindex ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._museum.outfitindex = Math.clamp(
                                        Number(result.get('number')) || 1,
                                        1, this.data._museum.character.outfits.length
                                    ) - 1;
    
                                    return true;
                                },
                                disabled: !(hasOutfits && hasMultiplePageOutfits)
                            },
                            {
                                // Next Page
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._museum.selectoutfitpage += 1;
                                    return true;
                                },
                                disabled: !(hasOutfits && hasMultiplePageOutfits && this.data._museum.selectoutfitpage < OutfitsPages.length - 1)
                            },
                        ],
                        [
                            {
                                // Prev Character
                                // emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "Previous : " + getCharacter(this.data.characters[this.data._museum.index - 1]),
                                action: function() {
                                    this.data._museum.index -= 1;
                                    return true;
                                },
                                disabled: typeof this.data.characters[this.data._museum.index - 1] === 'undefined'
                            },
                            {
                                // Next Character
                                // emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "Next : " + getCharacter(this.data.characters[this.data._museum.index + 1]),
                                action: function() {
                                    this.data._museum.index += 1;
                                    return true;
                                },
                                disabled: typeof this.data.characters[this.data._museum.index + 1] === 'undefined'
                            },
                        ],
                        [
                            { label: "Retour", action: function(interaction) {
                                if (!this.members.includes(interaction.user.id)) return false;
                                this.goto('museum-select');
                                return true;
                            }},
                            { emoji: '🏠', label: "Home", action: function(interaction) {
                                if (!this.members.includes(interaction.user.id)) return false;
                                this.goto('home');
                                return true;
                            }},
                        ]
                    ];
                },
            },

















            {
                name: "game-setup",
                beforeUpdate: function() {
                    if (this.data.characters.length == 0) {
                        this.goto('no-character');
                    }
                },
                embeds: function() {
                    return [{
                        title: "🥵\u2000\u2000𝗦\u2000𝗠\u2000𝗔\u2000𝗦\u2000𝗛\u2000\u2000𝗢\u2000𝗥\u2000\u2000𝗣\u2000𝗔\u2000𝗦\u2000𝗦\u2000\u2000🥶",
                        fields: [
                            {
                                name: "Personnages",
                                value: `Il existe ${this.data.characters.length} personnages !`,
                            },
                            {
                                name: "Configuration de la partie",
                                value: Locale.get(`command.sop.play.setup.field.value.mode.${this.data.gamemode}`, [this.data.count || this.data.characters.length]),
                            }
                        ],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    return [
                        ['random', 'famous', 'unfamous'].map(value => {
                            return {
                                label: Locale.get(`command.sop.play.setup.button.mode.${value}`),
                                style: this.data.gamemode === value ? ButtonStyle.Success : ButtonStyle.Secondary,
                                action: async function(interaction) {
                                    this.data.gamemode = value;
                                    return true;
                                },
                            };
                        }),
                        [10,25,50].map(value => {
                            return {
                                label: Locale.get(`command.sop.play.setup.button.count.character`, [value]),
                                style: !this.data.ccount && this.data.count === value ? ButtonStyle.Primary : ButtonStyle.Secondary,
                                action: async function(interaction) {
                                    this.data.count = value;
                                    this.data.ccount = false;
                                    return true;
                                },
                            };
                        }),
                        [
                            {
                                label: "Tous les personnages",
                                style: this.data.count === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary,
                                action: async function(interaction) {
                                    this.data.count = 0;
                                    this.data.ccount = false;
                                    return true;
                                },
                            },
                            {
                                label: this.data.ccount ? `Valeur personnalisée : ${this.data.count}` : "Valeur personnalisée",
                                style: this.data.ccount ? ButtonStyle.Primary : ButtonStyle.Secondary,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Selection du nombre de personnage", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: `Il existe ${this.data.characters.length} personnages`, placeholder: `${this.data.characters.length}` })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
                                    
                                    let n = result.get('number');

                                    if (isNaN(n)) return false;
                                    
                                    this.data.count = Math.clamp(Number(n), 1, this.data.characters.length);
                                    this.data.ccount = true;

                                    return true;
                                },
                            },
                        ],
                        [
                            {
                                label: "Lancer la partie",
                                action: function() {

                                    let list = [];
                                    switch (this.data.gamemode) {
                                        case "random":
                                            list = this.data.characters.shuffle().slice(0, this.data.count || this.data.characters.length);
                                        break;
                                        
                                        case "famous":
                                            list = this.data.characters.map(character => {
                                                let { smashed, passed } = character.stats;
                                                character.stats.ratio = (smashed - passed) / (smashed + passed);
                                                return character;
                                            }).sort((a,b) => b.stats.ratio - a.stats.ratio).slice(0, this.data.count || this.data.characters.length);
                                        break;
                                        
                                        case "unfamous":
                                            list = this.data.characters.map(character => {
                                                let { smashed, passed } = character.stats;
                                                character.stats.ratio = (smashed - passed) / (smashed + passed);
                                                return character;
                                            }).sort((a,b) => a.stats.ratio - b.stats.ratio).slice(0, this.data.count || this.data.characters.length);
                                        break;
                                        
                                        default:
                                            throw new Error("SMASH_OR_PASS_UNKNOWN_GAMEMODE");
                                    }


                                    this.data._game = {
                                        characters: [...list],
                                        character: null,
                                        attachment: null,
                                        outfit: null,
                                        smashed: [],
                                        passed: [],
                                    };

                                    this.goto('game-run');

                                    return true;
                                },
                                style: ButtonStyle.Success
                            },
                            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
                        ],
                        [
                            { emoji: '🏠', label: "Home", action: function(interaction) {
                                if (!this.members.includes(interaction.user.id)) return false;
                                this.goto('home');
                                return true;
                            }},
                        ],
                    ];
                }
            },
            {
                name: "no-character",
                embeds: function() {
                    return [{
                        title: "🥵 SMASH OR PASS 🥶",
                        fields: [{
                            name: "Problème de configuration",
                            value: "Il n'y à aucun petit boule de personnage à smash..."
                        }],
                        color: 0x5865F2,
                    }];
                },
                components: []
            },
            {
                name: "game-run",
                beforeUpdate: async function() {
                    if (this.data._game.characters.length == 0) {
                        this.goto('game-end');
                        await this.update();
                        return true;
                    }

                    let character = this.data._game.characters.outRandomElement();
                    this.data._game.character = character;
    
                    let outfit = character.outfits.getRandomElement() ?? { name: "_(No image available)_", url: NoOutfitDefaultImage };
                    this.data._game.outfit = outfit;
    
                    this.data._game.attachment = GetAttachment(outfit);
                },
                files: function() {
                    return this.data._game.attachment ? [ this.data._game.attachment ] : [];
                },
                embeds: function() {
                    let {character, outfit, attachment, smashed, passed} = this.data._game;
    
                    return [{
                        title: "🥵 SMASH OR PASS 🥶",
                        fields: [
                            {
                                name: FillString('Personnage', 16),
                                value: character.name ?? "John Doe",
                                inline: true
                            },
                            {
                                name: FillString('Arc', 16),
                                value: character.arc ?? "Narmol",
                                inline: true
                            },
                            {
                                name: "Tenue",
                                value: outfit.name,
                                inline: false
                            },
                        ],
                        image: {
                            url: attachment ? `attachment://${attachment.name}` : outfit.url
                        },
                        footer: {
                            text: `${smashed.length} Smash / ${passed.length} Pass • ${discordElement.member.displayName}`
                        },
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let { character } = this.data._game;

                    return [
                        [
                            {
                                emoji: { name: "🥵" },
                                label: "\u200b\u2000 SMASH \u2000\u200b",
                                style: ButtonStyle.Danger,
                                disabled: character.rules.cant_be_smash ?? false,
                                action: function() {
                                    this.data._game.smashed.push(character);
                                    return true;
                                }
                            },
                            {
                                emoji: { name: "🥶" },
                                label: "\u200b\u2000 PASS \u2000\u200b",
                                style: ButtonStyle.Primary,
                                disabled: character.rules.cant_be_pass ?? false,
                                action: function() {
                                    this.data._game.passed.push(character);
                                    return true;
                                }
                            },
                        ],
                        [
                            {
                                emoji: { name: "🔒" },
                                label: "Quittez la partie",
                                action: "stop"
                            }
                        ]
                    ];
                }
            },
            {
                name: "game-end",
                beforeUpdate: function() {
                    let {passed, smashed} = this.data._game;

                    smashed.forEach(c => Manager.SOP.smash(c.guild, c.uid));
                    passed.forEach(c => Manager.SOP.pass(c.guild, c.uid));

                    // this.collectorOptions.idle = 10_000;
                    // this.collector.stop('renew');

                    this.data._game.endIdleTimeout = setTimeout(() => {
                        this.collector.stop('stop');
                    }, 30_000);

                    this.deleteOnClose = false;
                },
                embeds: function() {
                    let {passed, smashed} = this.data._game;
    
                    let comment = null;
                    if (smashed.length == 0) comment = "Tu es l'aigri originel";
                    if (passed.length >= smashed.length * 2) comment = `Si tu devais être un cornichon, tu serais aigre doux 🥒`;
                    if (passed.length >= smashed.length * 3) comment = `Tu es tellement aigre que même un citron aurait honte 🍋`;
                    
                    if (smashed.length == passed.length) comment = `L'équilibre parfait, le ying est le yang 👀`;
                    
                    if (passed.length == 0) comment = "Tu es l'horny originel";
                    if (smashed.length >= passed.length * 2) comment = `Ton nom est à côté de la définition de "horny" dans le dictionnaire`;
                    if (smashed.length >= passed.length * 3) comment = `Direction horny jail.` + Emotes.pshitpshit;

                    return [{
                        title: "🥵 SMASH OR PASS 🥶",
                        description: "Récapitulatif de tes smash / pass\n" + (comment ?? ''),
                        fields: [
                            {
                                name: FillString("SMASH 🔥 🥵", 64),
                                value: '\u200b'+ (smashed.length > 0 ? smashed.map(s => `${s.name} _(${s.arc})_`).join('\n') : "Tu es trop aigri•e pour avoir smash qui que ce soit."),
                                inline: true
                            },
                            {
                                name: FillString("PASS ❄ 🥶", 64),
                                value: '\u200b'+ (passed.length > 0 ? passed.map(s => `${s.name} _(${s.arc})_`).join('\n') : "Tu es trop horny pour avoir pass qui que ce soit."),
                                inline: true
                            },
                        ],
                        footer: {
                            text: `${smashed.length} Smash / ${passed.length} Pass`
                        },
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    return [
                        [
                            {
                                emoji: { name: "🔁" },
                                label: "Recommencer",
                                action: function() {
                                    clearTimeout(this.data._game.endIdleTimeout);
                                    this.deleteOnClose = true;
                                    this.goto('home');
                                    return true
                                }
                            },
                            {
                                emoji: { name: "🔒" },
                                label: "Terminer",
                                action: function() {
                                    clearTimeout(this.data._game.endIdleTimeout);
                                    this.collector.stop('stop');
                                }
                            },
                            {
                                emoji: { name: "🚮" },
                                label: "Supprimer",
                                action: function() {
                                    clearTimeout(this.data._game.endIdleTimeout);
                                    this.deleteOnClose = true;
                                    this.collector.stop('stop');
                                }
                            }
                        ]
                    ];
                }
            }
        ]
    });
    
    await MenuGameSmashOrPass.send();
    await MenuGameSmashOrPass.handle();
}

async function ConfigCharacters({ discordElement, GuildData, UserData }) {
    let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
    let AllCharacters = await Manager.SOP.getAll(GuildData.id);
    loadingEmoteMessage.delete().catch(noop);

    const MenuConfigCharacters = new DiscordMenu({
        element: discordElement,
        collectorOptions: {
            // idle: 2_147_483_647,
            idle: 21_600_000
        },
        data: {
            characters: AllCharacters.sort(SortByName),
            _edit: {
                index: null,
            },
            _remove: {
                index: null,
            },
        },
        pages: [
            {
                name: "home",
                embeds: function() {
                    let columns = 1;
                    let cols = [];
                    do {
                        cols = this.data.characters.map(c => `${c.name} _(${c.arc})_`).divide(++columns);
                    } while (cols.some(c => c.join('\n').length > 1024));
    
                    fields = cols.map((col, index) => {
                        return {
                            name: index == 0 ? 'Personnages existants' : '\u200b',
                            value: col.length > 0 ? col.join('\n') : '_(No image available)_',
                            inline: true
                        };
                    });
    
                    return [{
                        title: "Configuration du Smash or Pass",
                        fields: fields.length > 0 ? fields : [{ name: 'Personnages existants', value: "_Aucun personnage existant_" }],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let hasAnyCharacters = this.data.characters.length > 0;
                    
                    return [
                        [
                            {
                                emoji: "➕",
                                label: "Add",
                                style: ButtonStyle.Secondary,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Création d'un personnage", time: 120_000 })
                                        .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: "John Doe" })
                                        .addRow().addTextField({ name: 'arc', label: "Nom de l'arc du personnage", placeholder: "Normal", value: 'Normal', required: false })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
    
                                    let newchar = await Manager.SOP.create({
                                        name: result.get('name'),
                                        arc: result.get('arc'),
                                        guild: GuildData.id
                                    });
    
                                    this.data.characters.push(newchar);
                                    this.data._edit.index = this.data.characters.lastIndex;
                                    
                                    this.goto('edit');
                                    this.data._edit.selectpage = 0;
                                    
                                    return true;
                                },
                            },
                            {
                                emoji: "🖋",
                                label: "Edit",
                                style: ButtonStyle.Secondary,
                                disabled: !hasAnyCharacters,
                                action: function() {
                                    this.goto('edit-select');
                                    
                                    this.data._edit.index = null;
                                    this.data._edit.selectpage = 0;
    
                                    return true
                                },
                            },
                            {
                                emoji: "➖",
                                label: "Remove",
                                style: ButtonStyle.Secondary,
                                disabled: !hasAnyCharacters,
                                action: function() {
                                    this.goto('remove-select');
                                    
                                    this.data._remove.index = null;
                                    this.data._remove.selectpage = 0;
    
                                    return true
                                },
                            },
                        ],
                        [
                            {
                                label: "Ajouter plusieurs personnage d'un coup",
                                action: async function(interaction) {
                                    interaction.deferUpdate();
                                    
                                    const filter = (collect) => {
                                        if (!this.members.includes(collect.author.id)) return false;
                                        return this.members.includes(interaction.user.id) && collect.content.split(/[\n:;,\|]+/gi).length > 0;
                                    }                                    

                                    let instruction = await interaction.channel.send({
                                        content: `\u200b\n_${interaction.user} Envoyez un message contenant la liste des personnages séparé par ligne ou par l'un de ces symboles : \`:;,|\` et optionnellement avec le nom de l'arc entre parenthèse, crochet ou accolade._`
                                    });
                                    let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(c => c).catch(() => null);
                                    
                                    instruction.delete();

                                    for (let collect of collected.values().array()) {
                                        collect.delete().catch(noop);
                                        if (collect.content == '.') continue;
                                        
                                        let matches = collect.content.split(/[\n:;,\|]+/gi);

                                        await matches.map(async (string) => {
                                            let arc = string.match(/[\(\[\{].*[\)\]\}]$/gi);

                                            let create = {
                                                name: string.replace(arc, '').trim(),
                                                guild: GuildData.id
                                            };

                                            if (arc) {
                                                create.arc = arc.get(0).slice(1,-1).trim();
                                            }

                                            let newchar = await Manager.SOP.create(create);
                                            this.data.characters.push(newchar);
                                        }).promise();
                                    }
                                    
                                    return true;
                                }
                            },
                        ],
                        [
                            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
                        ],
                    ];
                }
            },
            {
                name: "edit-select",
                embeds: function() {
                    let CharactersPages = this.data.characters.chunkOf(25);
    
                    return [{
                        title: "Liste des personnages",
                        fields: [{
                            name: FillString('Personnages'),
                            value: CharactersPages[this.data._edit.selectpage].map(c => `${c.name} _(${c.arc})_`).join('\n'),
                        }],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let CharactersPages = this.data.characters.chunkOf(25);
                    let hasMultiplePages = CharactersPages.length > 1;
    
                    return [
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: Locale.get("command.sop.config.select.select.placeholder"),
                                options: CharactersPages[this.data._edit.selectpage].map((character, index) => ({
                                    label: `${character.name} (${character.arc})`,
                                    value: character.uid,
                                })),
                                action: function(interaction) {
                                    this.data._edit.index = this.data.characters.findIndex(char => char.uid == interaction.values[0]);
                                    this.goto('edit');
                                    return true;
                                },
                            }
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) - 1, 0, CharactersPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._edit.selectpage < 1
                            },
                            {
                                label: `${this.data._edit.selectpage + 1}/${CharactersPages.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._edit.selectpage ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) + 1, 0, CharactersPages.length - 1);
    
                                    return true;
                                },
                                style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) + 1, 0, CharactersPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._edit.selectpage >= (CharactersPages.length - 1) 
                            },
                        ],
                        [
                            { emoji: '🏠', label: "Home", action: "goto:home", style: ButtonStyle.Secondary },
                        ]
                    ]
                }
            },
            {
                name: "edit",
                beforeUpdate: function() {
                    let character = this.data.characters[this.data._edit.index];
                    
                    let outfit = character.outfits.getRandomElement() ?? { name: "_(No image available)_", url: NoOutfitDefaultImage };
    
                    this.data._edit.character = character;
                    this.data._edit.outfit = outfit;
    
                    this.data._edit.attachment = GetAttachment(outfit);
                },
                embeds: function() {
                    let { character, outfit, attachment } = this.data._edit;
                    let { smashed, passed } = character.stats;
                    
                    let ratio = (smashed - passed) / (smashed + passed);

                    let columns = 1;
                    let cols = [];
                    do {
                        cols = character.outfits.map(o => o.name ?? '_Unknown Outfit Name_').divide(++columns);
                    } while (cols.some(c => c.join('\n').length > 1024));
    
                    outfitFields = cols.map((col, index) => {
                        return {
                            name: index == 0 ? 'Outfits' : '\u200b',
                            value: col.length > 0 ? col.join('\n') : '_(No image available)_',
                            inline: true
                        };
                    });
    
                    return [{
                        title: "Modification d'un personnage",
                        fields: [
                            {
                                name: FillString('Personnage', 32),
                                value: character.name ?? "John Doe",
                                inline: true
                            },
                            {
                                name: FillString('Arc', 32),
                                value: character.arc ?? "Narmol",
                                inline: true
                            },
                            {
                                name: 'Stats',
                                value: `- Smash ${smashed} fois\n- Pass ${passed} fois\n- Ratio : ${ratio}`,
                                inline: false
                            },
                            ...outfitFields
                        ],
                        image: {
                            url: outfit.base64 ? `attachment://${attachment.name}` : outfit.url
                        },
                        color: 0x5865F2,
                    }];
                },
                files: function() {
                    let { attachment } = this.data._edit;
    
                    if (attachment) {
                        return [ attachment ];
                    } else {
                        return [];
                    }
                },
                components: function() {
                    let character = this.data.characters[this.data._edit.index];
    
                    return [
                        [
                            {
                                emoji: "🖋",
                                label: "Renommer le personnage",
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Modification du personnage", time: 120_000 })
                                        .addRow()
                                        .addTextField({ name: 'name', label: "Nom du personnage", value: character.name, placeholder: "John Doe" })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
    
                                    this.data.characters[this.data._edit.index].name = result.get('name');
                                    await this.data.characters[this.data._edit.index].save();
    
                                    return true;
                                },
                            },
                            {
                                emoji: "🖋",
                                label: "Renommer l'arc",
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Modification du personnage", time: 120_000 })
                                        .addRow()
                                        .addTextField({ name: 'arc', label: "Arc du personnage", value: character.arc, placeholder: "Normal" })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
    
                                    this.data.characters[this.data._edit.index].arc = result.get('arc');
                                    await this.data.characters[this.data._edit.index].save();
    
                                    return true;
                                },
                            },
                            {
                                emoji: "🩲",
                                label: "Modifier les tenues",
                                action: "goto:edit-outfits"
                            },
                        ],
                        [
                            {
                                emoji: "🥵",
                                label: character.rules.cant_be_smash ? 'Rendre Smashable' : 'Rendre Non Smashable',
                                style: character.rules.cant_be_smash ? ButtonStyle.Danger : ButtonStyle.Primary,
                                action: function() {
                                    character.rules.cant_be_smash = !character.rules.cant_be_smash;
                                    character.save();
                                    return true;
                                }
                            },
                            {
                                emoji: "🥶",
                                label: character.rules.cant_be_pass ? 'Rendre Passable' : 'Rendre Non Passable',
                                style: character.rules.cant_be_pass ? ButtonStyle.Danger : ButtonStyle.Primary,
                                action: function() {
                                    character.rules.cant_be_pass = !character.rules.cant_be_pass;
                                    character.save();
                                    return true;
                                }
                            },
                        ],
                        [
                            {
                                emoji: '🤝',
                                label: "Autoriser un ou des membres à utiliser ce sous-menu",
                                action: async function(interaction) {
                                    if (!this.members.includes(interaction.user.id)) return false;
                                    interaction.deferUpdate();

                                    let allowedMembers = this.pages[this.page]?.allowedMembers ?? [];

                                    const filter = (collect) => {
			                            if (![...this.members, ...allowedMembers].includes(interaction.user.id)) return false;
                                        return this.members.includes(collect.author.id) && collect.mentions.users.keys().array().length > 0;
                                    }

                                    let instruction = await interaction.channel.send({
                                        content: `_${interaction.user} Mentionnez touts les utilisateurs supplémentaire qui auront accès à la modification de ce personnage._`
                                    });
                                    let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(c => c).catch(() => null);
                                    
                                    instruction.delete();

                                    await collected.values().array().flatMap(async (collect) => {
                                        let ids = collect.mentions.users.keys().array();
                                        
                                        this.pages[this.findPageIndex('edit')].allowedMembers = ids;
                                        this.pages[this.findPageIndex('edit-outfits')].allowedMembers = ids;

                                        collect.delete();
                                    }).promise();
                                    
                                },
                            },
                        ],
                        [
                            { label: "Retour", action: function(interaction) {
                                if (!this.members.includes(interaction.user.id)) return false;
                                this.goto('edit-select');
                                return true;
                            }},
                            { emoji: '🏠', label: "Home", action: function(interaction) {
                                if (!this.members.includes(interaction.user.id)) return false;
                                this.goto('home');
                                return true;
                            } },
                        ]
                    ]
                },
            },
            {
                name: "edit-outfits",
                beforeUpdate: function() {
                    let character = this.data.characters[this.data._edit.index];
    
                    this.data._edit.outfitindex = Math.clamp(
                        this.data._edit.outfitindex || 0,
                        0, character.outfits.length - 1
                    );
    
                    let outfit = character.outfits[this.data._edit.outfitindex] ?? { name: "_(No image available)_", url: NoOutfitDefaultImage };
    
                    this.data._edit.character = character;
                    this.data._edit.outfit = outfit;
    
                    this.data._edit.attachment = GetAttachment(outfit);
                },
                embeds: function() {
                    let { character, outfit, attachment } = this.data._edit;
    
                    let columns = 1;
                    let cols = [];
                    let formated = character.outfits.map((o,i) => `${i+1}. ${i == this.data._edit.outfitindex ? Emotes.chevron.white.right.simple : Emotes.empty} ${o.name ?? '_Unknown Outfit Name_'}`);
                    do {
                        cols = formated.divide(++columns);
                    } while (cols.some(c => c.join('\n').length > 1024));
    
                    outfitFields = cols.map((col, index) => {
                        return {
                            name: index == 0 ? 'Outfits' : '\u200b',
                            value: col.length > 0 ? col.join('\n') : '_(No image available)_',
                            inline: true
                        };
                    });
    
                    return [{
                        title: "Modification d'un personnage",
                        fields: [
                            {
                                name: FillString('Personnage', 32),
                                value: character.name ?? "John Doe",
                                inline: true
                            },
                            {
                                name: FillString('Arc', 32),
                                value: character.arc ?? "Narmol",
                                inline: true
                            },
                            {
                                name: "\u200b",
                                value: "\u200b",
                                inline: false
                            },
                            ...outfitFields
                        ],
                        image: {
                            url: attachment ? `attachment://${attachment.name}` : outfit.url
                        },
                        color: 0x5865F2,
                    }];
                },
                files: function() {
                    let { attachment } = this.data._edit;
    
                    if (attachment) {
                        return [ attachment ];
                    } else {
                        return [];
                    }
                },
                components: function() {
                    let character = this.data.characters[this.data._edit.index];
                    
                    this.data._edit.outfitindex = this.data._edit.outfitindex ?? 0;
    
                    let hasOutfits = character.outfits.length > 0;
                    let hasMultipleOutfits = character.outfits.length > 1;
    
                    return [
                        [
                            {
                                emoji: "➕",
                                label: "\u200b",
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Ajout d'une nouvelle tenue", time: 120_000 })
                                        .addRow().addTextField({ name: 'name', label: "Nom de la tenue", value: `Outfit #${character.outfits.length + 1}`, placeholder: "Nom de la tenue" })
                                        .addRow().addTextField({ name: 'url', label: "URL de l'image", placeholder: "Image URL" })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
    
                                    character.outfits.push({
                                        name: result.get('name'),
                                        url: result.get('url'),
                                    });
    
                                    await this.data.characters[this.data._edit.index].save();
                                    return true;
                                },
                            },
                            {
                                emoji: "🖋",
                                label: `\u200b`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Modification de la tenue", time: 120_000 })
                                        .addRow().addTextField({
                                            name: 'name',
                                            label: "Nom de la tenue",
                                            value: character.outfits[this.data._edit.outfitindex].name,
                                            placeholder: "Normal"
                                        })
                                        .addRow().addTextField({
                                            name: 'url',
                                            label: "URL de l'image",
                                            value: character.outfits[this.data._edit.outfitindex].url,
                                            placeholder: "Image URL"
                                        })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
    
                                    character.outfits[this.data._edit.outfitindex].name = result.get('name');
                                    character.outfits[this.data._edit.outfitindex].url = result.get('url');
    
                                    await this.data.characters[this.data._edit.index].save();
                                    return true;
                                },
                                disabled: !hasOutfits
                            },
                            {
                                emoji: "➖",
                                label: "\u200b",
                                action: async function() {
                                    character.outfits = [...character.outfits.slice(0, this.data._edit.outfitindex), ...character.outfits.slice(this.data._edit.outfitindex + 1)];
                                    
                                    await this.data.characters[this.data._edit.index].save();
                                    return true;
                                },
                                disabled: !hasOutfits
                            },
                        ],
                        [
                            {
                                emoji: "⏫",
                                label: "Ajout multiple (liens & upload)",
                                action: async function(interaction) {
                                    interaction.deferUpdate();
    
                                    const filter = (collect) => {
                                        if (interaction.user.id !== collect.author.id) return false;
                                        return ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                                    }
    
                                    let instruction = await interaction.channel.send({
                                        content: `\u200b\n_${interaction.user} Envoyez un message contenant des liens et/ou des images attachées_`
                                    });
                                    let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(c => c).catch(() => null);
                                    
                                    if (collected) {
                                        const ProcessMessage = async (message) => {
                                            for (let url of ExtractUrlsFromContent(message)) {
                                                character.outfits.push({
                                                    name: `Outfit #${character.outfits.length + 1}`,
                                                    url,
                                                });
                                            }

                                            for (let url of ExtractUrlsFromAttachments(message)) {
                                                character.outfits.push({
                                                    name: `Outfit #${character.outfits.length}`,
                                                    base64: await convertUrlToBase64(url),
                                                });
                                            }
                                        }
                                        
                                        await collected.values().array().map(async (message) => {
                                            await ProcessMessage(message);
                                            if (message.reference) {
                                                try {
                                                    let ref = await message.fetchReference();  
                                                    ProcessMessage(ref);
                                                } catch (e) {}
                                            }
                                            await message.delete().catch(noop);
                                        }).promise();
                                    }
    
                                    instruction.delete().catch(noop);
    
                                    await this.data.characters[this.data._edit.index].save();
                                    return true;
                                }
                            },
                        ],
                        [
                            {
                                emoji: "🖋",
                                label: "Renommer la tenue",
                                disabled: !hasOutfits,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Modification de la tenue", time: 120_000 })
                                        .addRow()
                                        .addTextField({
                                            name: 'name',
                                            label: "Nom de la tenue",
                                            value: character.outfits[this.data._edit.outfitindex].name,
                                            placeholder: "John Doe"
                                        })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;
    
                                    character.outfits[this.data._edit.outfitindex].name = result.get('name');
    
                                    await this.data.characters[this.data._edit.index].save();
                                    return true;
                                },
                            },
                            {
                                emoji: "💾",
                                label: "Convertir la tenue en version téléchargée",
                                disabled: !hasOutfits || !character.outfits[this.data._edit.outfitindex].url,
                                action: async function() {
                                    character.outfits[this.data._edit.outfitindex].base64 = await convertUrlToBase64(character.outfits[this.data._edit.outfitindex].url),
                                    character.outfits[this.data._edit.outfitindex].url = null;                                    

                                    await this.data.characters[this.data._edit.index].save();
                                    return true;
                                },
                            },
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._edit.outfitindex = Math.clamp(
                                        (this.data._edit.outfitindex ?? 0) - 1,
                                        0, character.outfits.length - 1
                                    )
                                    return true;
                                },
                                disabled: !(hasMultipleOutfits && this.data._edit.outfitindex > 0)
                            },
                            {
                                label: `${(this.data._edit.outfitindex || 0) + 1}/${character.outfits.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Aller à une tenue", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de l'outfit", placeholder: (this.data._edit.outfitindex ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._edit.outfitindex = Math.clamp(
                                        Number(result.get('number')) || 1,
                                        1, this.data._edit.character.outfits.length
                                    ) - 1;
    
                                    return true;
                                },
                                disabled: !hasMultipleOutfits
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._edit.outfitindex = Math.clamp(
                                        (this.data._edit.outfitindex ?? 0) + 1,
                                        0, character.outfits.length - 1
                                    )
                                    return true;
                                },
                                disabled: !(hasMultipleOutfits && this.data._edit.outfitindex < character.outfits.length - 1)
                            },
                        ],
                        [
                            { label: "Retour", action: "goto:edit"},
                            { emoji: '🏠', label: "Home", action: function(interaction) {
                                if (!this.members.includes(interaction.user.id)) return false;
                                this.goto('home');
                                return true;
                            } },
                        ]
                    ]
                },
            },
            {
                name: "remove-select",
                embeds: function() {
                    let CharactersPages = this.data.characters.chunkOf(25);
    
                    return [{
                        title: "Liste des personnages",
                        fields: [{
                            name: FillString('Personnages'),
                            value: CharactersPages[this.data._remove.selectpage].map(c => `${c.name} _(${c.arc})_`).join('\n'),
                        }],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let CharactersPages = this.data.characters.chunkOf(25);
                    let hasMultiplePages = CharactersPages.length > 1;
    
                    return [
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: Locale.get("command.sop.config.remove.select.placeholder"),
                                options: CharactersPages[this.data._remove.selectpage].map((character, index) => ({
                                    label: `${character.name} (${character.arc})`,
                                    value: character.uid,
                                })),
                                action: function(interaction) {
                                    this.data._remove.index = this.data.characters.findIndex(char => char.uid == interaction.values[0]);
                                    this.goto('remove');
                                    return true;
                                },
                            }
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() { return this.page = Math.clamp(this.page - 1, 0, CharactersPages.length); }, style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                label: `${this.data._remove.selectpage + 1}/${CharactersPages.length}`,
                                action: () => {},
                                style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() { return this.page = Math.clamp(this.page + 1, 0, CharactersPages.length); }, style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                        ],
                        [
                            { emoji: '🏠', label: "Home", action: "goto:home", style: ButtonStyle.Secondary },
                        ]
                    ]
                }
            },
            {
                name: "remove",
                embeds: function() {
                    let character = this.data.characters[this.data._remove.index];
    
                    return [{
                        title: "Suppression d'un personnage",
                        fields: [
                            {
                                name: FillString('Personnage', 32),
                                value: character.name ?? "John Doe",
                                inline: true
                            },
                            {
                                name: FillString('Arc', 32),
                                value: character.arc ?? "Narmol",
                                inline: true
                            },
                            {
                                name: "Outfits",
                                value: `Possède ${character.outfits.length} outfits.`,
                                inline: false
                            },
                        ],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let character = this.data.characters[this.data._remove.index];
    
                    return [
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.white_cancel),
                                label: "Supprimer",
                                action: async function() {
                                    let { guild, uid } = character;
                                    await Manager.SOP.delete(guild, uid);
                                    this.data.characters = [...this.data.characters.slice(0, this.data._remove.index), ...this.data.characters.slice(this.data._remove.index + 1)];
                                    
                                    if (this.data.characters.length > 0) {
                                        this.goto('remove-select');
                                    } else {
                                        this.goto('home');
                                    }
    
                                    this.data._remove.index = null;
                                    
                                    return true;
                                },
                                style: ButtonStyle.Danger
                            },
                        ],
                        [
                            { label: "Retour", action: "goto:remove-select" },
                            { emoji: '🏠', label: "Home", action: "goto:home" },
                        ]
                    ]
                },
            },
            
        ]
    });
    

    try {
        await MenuConfigCharacters.send();
        await MenuConfigCharacters.handle();
    } catch (err) {
        let errorstring = [
            err.name,
            err.message,
            (JSON.stringify(err.details, null, 2) ?? 'No details.'),
            err.stack,
        ].join('\n');

        const buffer = Buffer.from(errorstring, 'utf-8');
        let attachment = new AttachmentBuilder(buffer, { name: `error.txt` });

        discordElement.channel.send({
            content: `>>> # ${err.name}\n## ${err.message}`,
            files: [ attachment ]
        });
    }
}