const { ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, EmbedBuilder, AttachmentBuilder, TextInputStyle, Guild, ThreadManager, Utils, TextInputBuilder, Message, inlineCode } = require("discord.js");
const client = require("../../app");
const fs = require('fs');
const sharp = require('sharp');
const { noop, MD5, Wait } = require("../../modules/functions/Utils");
const { Cooldown } = require("../../modules/Cooldown");


const NotAvailableDefaultImage = "https://media.discordapp.net/attachments/605515103835521054/1317166160818602098/800px-No-Image-Placeholder.png";

function ExtractUrlsFromContent(element) {
    return element.content.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/gi) ?? [];
}

function ExtractUrlsFromAttachments(element) {
    return element.attachments.values().array().flatMap(e => {
        return e.contentType.startsWith('image/') ? e.proxyURL : null
    }).filter(e => e !== null);
}

const CachedAttachments = new Map();
function GetAttachment(base64) {
    let hash = MD5(base64);

    if (CachedAttachments.has(hash)) {
        return CachedAttachments.get(hash);
    } else {
        let attachment = Base64ToAttachment(base64, hash);
        CachedAttachments.set(hash, attachment);
        
        return attachment;
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

function AsyncDeleteMessage(msg, time = 5_000) {
    Wait(time).then(() => msg.delete().catch(noop));
}

module.exports = {
    name: "Ships",
    aliases: ['ship'],
    userPermission: client.PERMISSION.USER,
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "menu",
            aliases: ['menu'],
            description: Locale.get(`commandinfo.ships.option.menu.description`),
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "vote",
            aliases: ['v'],
            description: Locale.get(`commandinfo.ships.option.vote.description`),
            options: [
                {
                    type: ApplicationCommandOptionType.String,
                    name: "uid",
                    description: Locale.get(`commandinfo.ships.option.uid.description`),
                    required: true,
                },
            ],
        },
    ],
    run: async ({client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
        let discordElement = message ?? interaction;
        let { member } = discordElement;

        let subcommand = args.shift();
        if (!subcommand) subcommand = "menu";

        if (['menu', 'm'].includes(subcommand.toLowerCase().simplify())) {
            ShipMenu({ discordElement, GuildData, UserData, userPermissionLevel });
        } else
        
        if (['vote', 'v'].includes(subcommand.toLowerCase().simplify())) {
            if (typeof args[0] == 'undefined') return discordElement.reply(Locale.get('generic.error.command.not_enought_arguments')).then(AsyncDeleteMessage);

            if (await Manager.ships.exist(GuildData.id, args[0])) {
                let cooldown = new Cooldown({
                    name: `SHIP:VOTE`,
                    id: discordElement.author.id
                });

                cooldown.setTimestamp(UserData.cooldown.get(cooldown.name) ?? 0);

                if (cooldown.passed()) {
                    await Manager.ships.vote(GuildData.id, args[0]);
                    
                    cooldown.set(22 * 60 * 60);
                    UserData.cooldown.set(cooldown.name, cooldown.timestamp);
                    await UserData.save();

                    await discordElement.reply(`Le vote à été enregistré ${Emotes.checkmark}`).then(AsyncDeleteMessage);
                } else {
                    await discordElement.reply(Locale.get('generic.error.command.cooldown.relative', [cooldown.timestamp])).then(AsyncDeleteMessage);
                }
            } else {
                await discordElement.reply("L'uid du ship fourni n'existe pas ou plus.").then(AsyncDeleteMessage);
            }
        } else {
            await discordElement.reply(Locale.get('generic.error.subcommand.unknow')).then(AsyncDeleteMessage);
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

const ResolveUser = function(o) {
    let user = client.users.resolve(o);
    return user?.globalName || user?.username || `Unknown Username`;
}

async function ShipMenu({ discordElement, GuildData, UserData, userPermissionLevel }) {
    let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
    let Ships = await Manager.ships.getAll(GuildData.id);
    loadingEmoteMessage.delete().catch(noop);

    const MenuGameSmashOrPass = new DiscordMenu({
        element: discordElement,
        collectorOptions: {
            idle: 2 * 60 * 60 * 1000 
        },
        data: {
            types: { canon: "Ship canon", fanon: `Ship fanon` },
            userPermissionLevel,
            ships: Ships,
            _view: {},
            _search: {},
            _manage: {},
            _edit: {},
        },
        pages: [
            {
                name: "home",
                embeds: function() {
                    return [{
                        title: "Ship manager",
                        description: `Oui.`,
                        fields: [
                            {
                                name: "Ships ",
                                value: `Il existe ${this.data.ships.length} ships !`,
                            }
                        ],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    return [
                        [
                            {
                                emoji: "🎲",
                                label: "Voir Ship aléatoire",
                                action: function() {
                                    this.data._view.index = this.data.ships.getRandomIndex();
                                    this.goto('ship-view');

                                    return true;
                                },
                                disabled: this.data.ships.length < 1
                            },
                            {
                                emoji: "🔎",
                                label: "Trouver un ship",
                                action: "goto:ship-search",
                                disabled: this.data.ships.length < 1
                            },
                        ],
                        [
                            {
                                emoji: "⚙",
                                label: "Créer / Modifier des ships",
                                action: "goto:ship-manage"
                            },
                        ],
                        [
                            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
                        ]
                    ]
                }
            },

            {
                name: "ship-view",
                beforeUpdate: function() {
                    let ship = this.data.ships[this.data._view.index];
                    
                    this.data._view.attachment = ship.image ? GetAttachment(ship.image) : null;
                },
                files: function() {
                    let { attachment } = this.data._view;

                    return attachment ? [ attachment ] : [];
                },
                embeds: function() {
                    let { attachment } = this.data._view;
                    
                    let ship = this.data.ships[this.data._view.index];

                    return [{
                        title: "SHIP",
                        fields: [
                            {
                                name: "Créateurs",
                                value: [ ship.author, ...ship.editors ].map(id => `<@${id}>`).join('')
                            },
                            {
                                name: "Personnages",
                                value: ship.characters.length > 0 ? ship.characters.map((c,i) => `${i + 1}. ${c}`).join('\n') : '\u200b',
                                inline: true,
                            },
                            {
                                name: "Informations",
                                value: [
                                    this.data.types[ship.type] ?? 'Unknown',
                                    `${ship.votes} votes`
                                ].map(e => `- ${e}`).join('\n'),
                                inline: true,
                            },
                            {
                                name: "Commande de vote rapide",
                                value: "```"+`${GuildData.prefix ?? client.config.prefix}ship vote ${ship.uid}`+"```"
                            },
                        ],
                        image: {
                            url: attachment ? `attachment://${attachment.name}` : NotAvailableDefaultImage
                        },
                        footer: {
                            text: `Ship créer par ${ResolveUser(ship.author)}`
                        },
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let ship = this.data.ships[this.data._view.index];

                    let cooldown = new Cooldown({
                        name: `SHIP:VOTE`,
                        id: discordElement.author.id
                    });

                    cooldown.setTimestamp(UserData.cooldown.get(cooldown.name) ?? 0);

                    return [
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.upvote),
                                label: "Voter !",
                                style: ButtonStyle.Success,
                                action: async function() {
                                    // Force Check timestamp
                                    let userdata = await Manager.user.get(UserData.guild, UserData.id, { cooldown: 1 });
                                    if (userdata.cooldown.get(cooldown.name) > Date.timestamp()) {
                                        UserData.cooldown.set(cooldown.name, userdata.cooldown.get(cooldown.name));
                                        return true;
                                    }

                                    this.data.ships[this.data._view.index].votes += 1;
                                    await Manager.ships.vote(ship.guild, ship.uid);

                                    cooldown.set(22 * 60 * 60);
                                    UserData.cooldown.set(cooldown.name, cooldown.timestamp);
                                    await UserData.save();

                                    return true;
                                },
                                disabled: !cooldown.passed(),
                            },
                            {
                                emoji: "🎲",
                                label: "Voir Ship aléatoire",
                                action: function() {
                                    if (this.data.ships.length < 2) return false;

                                    let index;
                                    do {
                                        index = this.data.ships.getRandomIndex();
                                    } while (index == this.data._view.index);

                                    this.data._view.index = index;

                                    return true;
                                },
                            },
                        ],
                        [
                            { emoji: '🏠', label: "Home", action: "goto:home", style: ButtonStyle.Secondary },
                        ]
                    ];
                }
            },

            {
                name: "ship-search",
                beforeUpdate: function() {
                    let { selectpage } = this.data._search ?? {};

                    this.data._search.selectpage = selectpage ?? 0;
                },
                embeds: function() {
                    let ShipsPages = this.data.ships.chunkOf(25);
                    
                    return [{
                        title: "Liste des ships",
                        fields: [{
                            name: FillString('Ships'),
                            value: ShipsPages[this.data._search.selectpage].map((ship,i) => `${(i + 1) + (this.data._search.selectpage * 25)}. ${ship.characters.join(' + ')}`).join('\n'),
                        }],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let ShipsPages = this.data.ships.filter(ship => ship.characters.length > 1).chunkOf(25);
                    let hasMultiplePages = ShipsPages.length > 1;

                    return [
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: "Selectionnez un ship à voir",
                                options: ShipsPages[this.data._search.selectpage].map((ship, index) => ({
                                    label: `[${index + (this.data._search.selectpage * 25)}] ${ship.characters.join(' + ')}`.slice(0,100),
                                    value: ship.uid,
                                })),
                                action: function(interaction) {
                                    this.data._view.index = this.data.ships.findIndex(ship => ship.uid == interaction.values[0]);
                                    this.goto('ship-view');
                                    return true;
                                },
                            }
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._search.selectpage = Math.clamp((this.data._search.selectpage || 0) - 1, 0, ShipsPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._search.selectpage < 1
                            },
                            {
                                label: `${this.data._search.selectpage + 1}/${ShipsPages.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._search.selectpage ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._search.selectpage = Math.clamp((this.data._search.selectpage || 0) + 1, 0, ShipsPages.length - 1);
    
                                    return true;
                                },
                                style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._search.selectpage = Math.clamp((this.data._search.selectpage || 0) + 1, 0, ShipsPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._search.selectpage >= (ShipsPages.length - 1) 
                            },
                        ],

                        [
                            { emoji: '🏠', label: "Home", action: "goto:home", style: ButtonStyle.Secondary },
                        ]
                    ]
                }
            },

            {
                name: 'ship-manage',
                beforeUpdate: function() {
                    let { selectpage } = this.data._manage ?? {};

                    this.data._manage.allowedToManage = this.data.ships.filter(ship => {
                        return this.data.userPermissionLevel >= client.PERMISSION.GUILD_MOD || ship.author === this.element.member.id || ship.editors.include(this.element.member.id);
                    });

                    this.data._manage.selectpage = selectpage ?? 0;
                },
                embeds: function() {
                    let AllowedShips = this.data._manage.allowedToManage;

                    let ShipsPages = AllowedShips.chunkOf(25);

                    return [
                        {
                            title: "Gestion des Ships",
                            fields: [
                                {
                                    name: "Vos Ships",
                                    value: AllowedShips.length > 0
                                        ? ShipsPages[this.data._manage.selectpage].map((ship,i) => `${(i + 1) + (this.data._manage.selectpage * 25)}. ${ship.characters.join(' + ')}`).join('\n')
                                        : 'Tu ne peux modifier aucun ship'
                                }
                            ],
                            color: 0x5865F2,
                        }
                    ]
                },
                components: function() {
                    let AllowedShips = this.data._manage.allowedToManage;
                    let ShipsPages = AllowedShips.chunkOf(25);

                    let hasAnyPages = ShipsPages.length > 0;
                    let hasMultiplePages = ShipsPages.length > 1;

                    let canDelete = this.data.ships[this.data._manage.selectedIndex]?.author === this.element.member.id || this.data.userPermissionLevel >= client.PERMISSION.GUILD_MOD;

                    return [
                        [
                            {
                                emoji: "➕",
                                label: "Ajout",
                                action: async function() {    
                                    let newship = await Manager.ships.create({
                                        guild: GuildData.id,
                                        author: UserData.id,
                                    });
    
                                    this.data.ships.push(newship);

                                    this.data._edit.index = this.data.ships.lastIndex;
                                    
                                    this.goto('ship-edit');
                                    this.data._edit.selectpage = 0;
                                    
                                    this.data._manage.selectedIndex = null;
                                    return true;
                                },
                            },
                            {
                                label: "Modifier",
                                action: async function() {
                                    this.data._edit.index = this.data._manage.selectedIndex;
                                    this.data._manage.selectedIndex = null;
                                    this.goto('ship-edit');
                                    return true;
                                },
                                disabled: typeof this.data._manage.selectedIndex !== 'number'
                            },
                            {
                                label: "Supprimer",
                                action: async function() {
                                    let {guild, uid} = this.data.ships[this.data._manage.selectedIndex];

                                    await Manager.ships.delete(guild, uid);

                                    this.data.ships = this.data.ships.filter((e,i) => i !== this.data._manage.selectedIndex);
                                    this.data._manage.selectedIndex = null;
                                    return true;
                                },
                                disabled: !canDelete || typeof this.data._manage.selectedIndex !== 'number'
                            },
                        ],
                        [
                            {
                                type: ComponentType.StringSelect,
                                disabled: AllowedShips.length < 1,
                                placeholder: "Selectionnez un ship à modifier",
                                options: hasAnyPages
                                    ? ShipsPages[this.data._manage.selectpage].map((ship, index) => ({
                                        label: `${(index + 1) + (this.data._manage.selectpage * 25)}. ${ship.characters.length > 0 ? ship.characters.join(' + ') : ship.uid}`,
                                        value: ship.uid,
                                        default: this.data.ships[this.data._manage.selectedIndex]?.uid === ship.uid
                                    }))
                                    : [{ label: "Aucune ship.", value: 'missingno', default: true }],
                                action: function(interaction) {
                                    this.data._manage.selectedIndex = this.data.ships.findIndex(char => char.uid == interaction.values[0]);
                                    return true;
                                },
                                disabled: !hasAnyPages
                            }
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._manage.selectpage = Math.clamp((this.data._manage.selectpage || 0) - 1, 0, ShipsPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._manage.selectpage < 1
                            },
                            {
                                label: `${this.data._manage.selectpage + 1}/${ShipsPages.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._manage.selectpage ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._manage.selectpage = Math.clamp((this.data._manage.selectpage || 0) + 1, 0, ShipsPages.length - 1);
    
                                    return true;
                                },
                                style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._manage.selectpage = Math.clamp((this.data._manage.selectpage || 0) + 1, 0, ShipsPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._manage.selectpage >= (ShipsPages.length - 1) 
                            },
                        ],
                        [
                            {
                                emoji: "🏠",
                                label: "Home",
                                action: "goto:home"
                            },
                        ],
                    ]
                }
            },

            {
                name: "ship-edit",
                beforeUpdate: function() {
                    let ship = this.data.ships[this.data._edit.index];
                    
                    this.data._edit.attachment = ship.image ? GetAttachment(ship.image) : null;
                },
                files: function() {
                    let { attachment } = this.data._edit;

                    return attachment ? [ attachment ] : [];
                },
                embeds: function() {
                    let { attachment } = this.data._edit;
                    let ship = this.data.ships[this.data._edit.index];

                    return [{
                        title: "Modification du ship",
                        fields: [
                            {
                                name: "Créateurs",
                                value: [ ship.author, ...ship.editors ].map(id => `<@${id}>`).join('\n')
                            },

                            {
                                name: "Personnages",
                                value: ship.characters.length > 0 ? ship.characters.map((c,i) => `${i + 1}. ${c}`).join('\n') : '\u200b',
                                inline: true,
                            },
                            {
                                name: "Type de couple",
                                value: this.data.types[ship.type] ?? 'Unknown',
                                inline: true,
                            },
                        ],
                        image: {
                            url: attachment ? `attachment://${attachment.name}` : NotAvailableDefaultImage
                        },
                        footer: {
                            text: `Ship créer par ${ResolveUser(ship.author)}`
                        },
                        color: 0x5865F2,
                    }]
                },
                components: function() {
                    let ship = this.data.ships[this.data._edit.index];

                    return [
                        [
                            {
                                label: "Personnages",
                                action: function() {
                                    this.data.ships[this.data._edit.index] = ship;

                                    this.goto('ship-edit-characters');
                                    return true;
                                }
                            },
                            {
                                label: "Editeurs",
                                action: "noop"
                            },
                        ],
                        [
                            {
                                emoji: "🖼",
                                label: "Image",
                                action: async function(interaction) {
                                    interaction.deferUpdate();
    
                                    const filter = (collect) => {
                                        if (interaction.user.id !== collect.author.id) return false;
                                        return ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                                    }
    
                                    let instruction = await interaction.channel.send({
                                        content: `\u200b\n_${interaction.user} Envoyez un message contenant un lien ou une image attachée_`
                                    });
                                    let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).catch(noop);

                                    if (collected) {
                                        let message = collected.first();
                                        let urls = [...ExtractUrlsFromAttachments(message), ...ExtractUrlsFromContent(message)];
                                        
                                        if (urls[0]) {
                                            ship.image = await convertUrlToBase64(urls[0]);
                                        }

                                        await message.delete().catch(noop);
                                    }

                                    instruction.delete().catch(noop);

                                    return true
                                }
                            },
                            {
                                emoji: "🚮",
                                label: "Supprimer l'image",
                                action: async function() {
                                    ship.image = null;

                                    return true
                                }
                            },
                        ],
                        [
                            {
                                label: `Type de ship : ${ this.data.types[ship.type] ?? 'Unknown' }`,
                                action: async function() {
                                    let types = Object.keys(this.data.types);
                                    let index = types.findIndex(type => ship.type == type);

                                    ship.type = types[(index + 1) % types.length];

                                    return true;
                                }
                            },
                        ],
                        [
                            {
                                emoji: "💾",
                                label: "Save",
                                style: ButtonStyle.Success,
                                action: async function() {
                                    this.data.ships[this.data._edit.index] = ship;
                                    await ship.save();

                                    return false
                                }
                            },
                            {
                                label: "Retour",
                                action: "goto:ship-manage"
                            },
                        ],
                    ]
                }
            },
            {
                name: 'ship-edit-characters',
                beforeUpdate: function() {
                    let { selectpage } = this.data._edit;
                    let ship = this.data.ships[this.data._edit.index];
                    
                    this.data._edit.selectpage = selectpage ?? 0;
                },
                embeds: function() {
                    return this.pages.find(page => page.name == 'ship-edit')?.embeds.apply(this, arguments);
                },
                components: function() {
                    let ship = this.data.ships[this.data._edit.index];

                    let CharactersPages = ship.characters.chunkOf(25);
                    
                    let hasMultiplePages = CharactersPages.length > 1

                    return [
                        [
                            {
                                label: "Ajouter",
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Modification", time: 120_000 })
                                        .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: "John Doe" });
                                    ;

                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;

                                    ship.characters.push(result.get('name'));

                                    console.inspect(ship.characters)

                                    return true;
                                }
                            },
                            {
                                label: "Modifier",
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Modification", time: 120_000 })
                                        .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: "John Doe", value: ship.characters[this.data._edit.selectedIndex] });
                                    ;

                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result) return false;

                                    ship.characters[this.data._edit.selectedIndex] = result.get('name');

                                    return true;
                                },
                                disabled: typeof this.data._edit.selectedIndex !== 'number'
                            },
                            {
                                label: "Supprimer",
                                action: async function() {
                                    ship.characters = ship.characters.filter((e,i) => i !== this.data._edit.selectedIndex);
                                    this.data._edit.selectedIndex = null;
                                    return true;
                                },
                                disabled: typeof this.data._edit.selectedIndex !== 'number'
                            },
                        ],
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: "Selection d'un personnage",
                                options: ship.characters.length > 0
                                    ? CharactersPages[this.data._edit.selectpage].map((character, index) => ({
                                        label: `${(index + 1) + (this.data._edit.selectpage * 25)}. ${character}`,
                                        value: '' + (index + (this.data._edit.selectpage * 25)),
                                        default: index + (this.data._edit.selectpage * 25) === this.data._edit.selectedIndex
                                    }))
                                    : [{ label: "Aucun personnage selectionnable", value: "missingno", default: true }]
                                ,
                                action: function(interaction) {
                                    this.data._edit.selectedIndex = Number(interaction.values[0]);
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
                                disabled: !hasMultiplePages || this.data._edit.selectpage >= CharactersPages.lastIndex
                            },
                        ],
                        [
                            {
                                label: "Retour",
                                action: "goto:ship-edit"
                            },
                        ],
                    ];
                },
            }
        ]
    });
    
    await MenuGameSmashOrPass.send();
    await MenuGameSmashOrPass.handle();
}
