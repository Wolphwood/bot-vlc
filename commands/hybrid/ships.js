import {
  ApplicationCommandType,
  ApplicationCommandOptionType,
  ComponentType,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";

import sharp from "sharp";

import {
  noop, MD5, Wait,
  ModalForm, DiscordMenu
} from "#modules/Utils";

import { Cooldown } from "#modules/Cooldown";
import { PERMISSION } from "#constants";
import { Locales } from "#modules/Locales";
import Emotes from "#modules/Emotes";

import { dbManager } from '#modules/database/Manager';

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

export default {
  name: "Ships",
  aliases: ['ship'],
  userPermission: PERMISSION.USER,
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "menu",
        aliases: ['menu'],
        description: Locales.get(`commandinfo.ships.option.menu.description`),
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: "vote",
        aliases: ['v'],
        description: Locales.get(`commandinfo.ships.option.vote.description`),
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: "uid",
            description: Locales.get(`commandinfo.ships.option.uid.description`),
            required: true,
          },
        ],
      },
    ],
  },
  run: async ({client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
    let discordElement = message ?? interaction;
    let { member } = discordElement;

    let subcommand = args.shift();
    if (!subcommand) subcommand = "menu";

    if (['menu', 'm'].includes(subcommand.toLowerCase().simplify())) {
      ShipMenu({ client, discordElement, GuildData, UserData, userPermissionLevel });
    } else
    
    if (['vote', 'v'].includes(subcommand.toLowerCase().simplify())) {
      if (typeof args[0] == 'undefined') return discordElement.reply(Locales.get('generic.error.command.not_enought_arguments')).then(AsyncDeleteMessage);

      if (await dbManager.ships.exist(GuildData.id, args[0])) {
        let cooldown = new Cooldown({
          name: `SHIP:VOTE`,
          id: discordElement.author.id
        });

        cooldown.setTimestamp(UserData.cooldown.get(cooldown.name) ?? 0);

        if (cooldown.passed()) {
          await dbManager.ships.vote(GuildData.id, args[0]);
          
          cooldown.set(22 * 60 * 60);
          UserData.cooldown.set(cooldown.name, cooldown.timestamp);
          await UserData.save();

          await discordElement.reply(`Le vote à été enregistré ${Emotes.checkmark}`).then(AsyncDeleteMessage);
        } else {
          await discordElement.reply(Locales.get('generic.error.command.cooldown.relative', [cooldown.timestamp])).then(AsyncDeleteMessage);
        }
      } else {
        await discordElement.reply("L'uid du ship fourni n'existe pas ou plus.").then(AsyncDeleteMessage);
      }
    } else {
      await discordElement.reply(Locales.get('generic.error.subcommand.unknow')).then(AsyncDeleteMessage);
    }
  },
};

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

const ResolveUser = function(client, o) {
  let user = client.users.resolve(o);
  return user?.globalName || user?.username || null;
}

async function ShipMenu({ client, discordElement, GuildData, UserData, userPermissionLevel }) {
  let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
  let Ships = await dbManager.ships.getAll(GuildData.id);
  loadingEmoteMessage.delete().catch(noop);

  const MenuGameSmashOrPass = new DiscordMenu({
    element: discordElement,
    collectorOptions: {
      idle: 2 * 60 * 60 * 1000 
    },
    data: {
      methods: {
        getRandomCancelationPassword(count = 3) {
          const motsAnnulation = ["Stop", "Fin", "Non", "Rien", "Skip", "Vide", "Annule", "Pass", "Sors", "Zéro", "Oublie", "Ferme", "Fini", "Halt"];

          const shuffle = motsAnnulation.sort(() => 0.5 - Math.random());
          return shuffle.slice(0, count).join(""); // Prend 3 mots aléatoires et les concatène
        },
        editEditorsCancelLegOwnership() {
          if (this.data._edit.__giveOwnershipMessage !== null) {
            this.data._edit.__giveOwnershipMessage?.delete().catch(noop);
            this.data._edit.__giveOwnershipMessage = null;
          }

          if (this.data._edit.__giveOwnership !== null) {
            clearTimeout(this.data._edit.__giveOwnership);
            this.data._edit.__giveOwnership = null;
          }

          this.data._edit.__giveOwnershipInteraction = false;
        },
        manageDeleteCancel() {
          if (this.data._manage._deleteConfirm !== null) {
            this.data._manage._deleteConfirm?.delete().catch(noop);
            this.data._manage._deleteConfirm = null;
          }

          if (this.data._manage._deleteConfirmTimeout !== null) {
            clearTimeout(this.data._manage._deleteConfirmTimeout);
            this.data._manage._deleteConfirmTimeout = null;
          }

          this.data._manage._deleteConfirmInteraction = false;
        },
      },
      types: { canon: "Ship canon", fanon: "Ship fanon", crack: "Crack Ships", crossover: "Crossover Ships" },
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
            title: "Ship dbmanager",
            description: "Un *ship* est une relation imaginée ou confirmée entre deux personnages, souvent d’une œuvre de fiction.\nQue ce soit un couple officiel (*canon*) ou une création de fans (*fanon*), les ships permettent d’explorer des dynamiques inédites à travers discussions, fanfictions et fanarts.\nCertains ships sont populaires et consensuels, d’autres plus inattendus (*crack ships*), mais tous reflètent l’attachement des fans à leurs personnages favoris.\nQue tu sois ici pour partager tes OTP (One True Pairings) ou découvrir de nouvelles associations, amuse-toi et respecte les goûts de chacun ! 🚢💖",
            fields: [
              {
                name: "Ships",
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
              {
                emoji: "🥇",
                label: "Voir le top",
                action: "goto:ship-top"
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
              text: `Ship créer par ${ResolveUser(client, ship.author) ?? 'Unknown'}`
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
                  let userdata = await dbManager.user.get(UserData.guild, UserData.id, { cooldown: 1 });
                  if (userdata.cooldown.get(cooldown.name) > Date.timestamp()) {
                    UserData.cooldown.set(cooldown.name, userdata.cooldown.get(cooldown.name));
                    return true;
                  }

                  this.data.ships[this.data._view.index].votes += 1;
                  await dbManager.ships.vote(ship.guild, ship.uid);

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
        name: "ship-top",
        embeds: function() {
          let ships = this.data.ships;

          let nVotes = ships.map(s => s.votes).unique().sort();

          return [{
            title: "Top 10 Ship !",
            fields: nVotes.map((value, index) => {
              let s = ships.filter(s => s.votes === value);

              return {
                name: `${['🥇','🥈','🥉'][index] ?? ''} Top ${index + 1}`.trim(),
                value: s.map(s => "`["+ s.uid +"]`" + '\u2000' + s.characters.join(' + ')).join('\n')
              };
            }),
            color: 0x5865F2,
          }];
        },
        components: function() {
          return [
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
                action: function({ interaction }) {
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
                action: async function({ interaction }) {
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

          if (!this.data._manage._deleteConfirmInteraction) this.methods.manageDeleteCancel();
          this.data._manage._deleteConfirmInteraction = false;

          this.data._manage.allowedToManage = this.data.ships.filter(ship => {
            return this.data.userPermissionLevel >= client.PERMISSION.GUILD_MOD || ship.author === this.element.member.id || ship.editors.includes(this.element.member.id);
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
          let ship = this.data.ships[this.data._manage.selectedIndex];
          
          let AllowedShips = this.data._manage.allowedToManage;
          let ShipsPages = AllowedShips.chunkOf(25);

          let hasAnyPages = ShipsPages.length > 0;
          let hasMultiplePages = ShipsPages.length > 1;
          
          let isAuthor = ship?.author === this.element.member.id;
          let canDelete = isAuthor || this.data.userPermissionLevel >= client.PERMISSION.GUILD_MOD;

          return [
            [
              {
                emoji: "➕",
                label: "Ajouter",
                action: async function() {  
                  let newship = await dbManager.ships.create({
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
                emoji: '✏',
                label: "Modifier",
                action: async function() {
                  this.methods.manageDeleteCancel();

                  this.data._edit.index = this.data._manage.selectedIndex;
                  this.data._manage.selectedIndex = null;
                  this.goto('ship-edit');
                  return true;
                },
                disabled: typeof this.data._manage.selectedIndex !== 'number'
              },
              {
                emoji: '🗑️',
                label: this.data._manage._deleteConfirm ? "Confirmer la suppression" : "Supprimer",
                style: this.data._manage._deleteConfirm ? ButtonStyle.Danger : ButtonStyle.Secondary,
                action: async function({ interaction }) {
                  if (this.data._manage._deleteConfirm) {
                    let {guild, uid} = this.data.ships[this.data._manage.selectedIndex];

                    await dbManager.ships.delete(guild, uid);

                    this.data.ships = this.data.ships.filter((e,i) => i !== this.data._manage.selectedIndex);
                    this.data._manage.selectedIndex = null;
                  } else {
                    this.data._manage._deleteConfirm = await interaction.channel.send({
                      content: `_${interaction.user} :warning: : Cette action est définitive. Voulez-vous continuer ?\nAppuyez de nouveau pour confirmer ou faites une autre action pour annuler._`
                    });

                    this.data._manage._deleteConfirmInteraction = true;

                    this.data._manage._deleteConfirmTimeout = setTimeout(() => {
                      this.methods.manageDeleteCancel();
                      this.update(interaction);
                    }, 10_000);
                  }
                  
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
                action: function({ interaction }) {
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
                action: async function({ interaction }) {
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
                action: function() {
                  this.methods.manageDeleteCancel();
                  this.goto('home');
                  return true;
                }
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
                value: [ ship.author, ...ship.editors ].map(id => `<@${id}>`).join(' ').slice(0,1024)
              },

              {
                name: "Personnages",
                value: ship.characters.length > 0 ? ship.characters.map((c,i) => `${i + 1}. ${c}`).join('\n') : '\u200b',
                inline: true,
              },
              {
                name: "Univers",
                value: ship.universes.length > 0 ? ship.universes.map((c,i) => `${i + 1}. ${c}`).join('\n') : '\u200b',
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
              text: `Ship créer par ${ResolveUser(client, ship.author) ?? 'Unknown'}`
            },
            color: 0x5865F2,
          }]
        },
        components: function() {
          let ship = this.data.ships[this.data._edit.index];
          let isAuthor = ship.author === this.element.member.id;

          return [
            [
              {
                label: "Personnages",
                action: function() {
                  this.goto('ship-edit-characters');
                  return true;
                }
              },
              {
                label: "Univers",
                action: function() {
                  this.goto('ship-edit-universes');
                  return true;
                }
              },
              {
                label: "Editeurs",
                action: function() {
                  this.goto('ship-edit-editors');
                  return true;
                },
                disabled: !isAuthor
              },
            ],
            [
              {
                emoji: "🖼",
                label: "Image",
                action: async function({ interaction }) {
                  if (this.data._edit._LockImageButton) return false;
                  this.data._edit._LockImageButton = true;

                  interaction.deferUpdate();
  
                  const filter = (collect) => {
                    if (interaction.user.id !== collect.author.id) return false;
                    if (collect.content.toLowerCase().simplify().indexOf(cancelationWord.toLowerCase().simplify()) > -1) return true;
                    return ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                  }
  
                  let cancelationWord = this.methods.getRandomCancelationPassword();

                  let instruction = await interaction.channel.send({
                    content: `_${interaction.user} Envoyez un message contenant un lien ou une image attachée\nOu tapez \`${cancelationWord}\` pour annuler._`
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
                  this.data._edit._LockImageButton = false;

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
              {
                emoji: '❔',
                action: "goto:ship-type-info"
              },
            ],
            [
              {
                label: "Retour",
                action: "goto:ship-manage"
              },
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
            ],
          ]
        }
      },
      {
        name: "ship-type-info",
        embeds: [{
          title: "Les Types de Ships",
          fields: [
            {
              name: "Canon Ships",
              value: "Relations officielles établies dans l’histoire (ex. Naruto x Hinata)"
            },
            {
              name: "Fanon Ships",
              value: "Relations imaginées par les fans (ex. Harry x Draco)"
            },
            {
              name: "Crack Ships",
              value: "Paires improbables, souvent humoristiques (ex. Voldemort x Chaussette)"
            },
            {
              name: "Crossover Ships",
              value: "Couples entre personnages d’univers différents (ex. Elsa x Jack Frost)"
            },
          ],
          color: 0x5865F2,
        }],
        components: [
          [
            {
              label: "Retour",
              action: "goto:ship-edit"
            }
          ]
        ]
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
        files: function() {
          return this.pages.find(page => page.name == 'ship-edit')?.files.apply(this, arguments);
        },
        components: function() {
          let ship = this.data.ships[this.data._edit.index];

          let CharactersPages = ship.characters.chunkOf(25);
          
          let hasMultiplePages = CharactersPages.length > 1

          return [
            [
              {
                emoji: "➕",
                label: "Ajouter",
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Modification", time: 120_000 })
                    .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: "John Doe" });
                  ;

                  let result = await modal.setInteraction(interaction).popup();
                  if (!result) return false;

                  ship.characters.push(result.get('name'));

                  return true;
                }
              },
              {
                emoji: '✏',
                label: "Modifier",
                action: async function({ interaction }) {
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
                emoji: '🗑️',
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
                action: function({ interaction }) {
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
                action: async function({ interaction }) {
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
      },
      {
        name: 'ship-edit-editors',
        beforeUpdate: function() {
          let { selectpage } = this.data._edit;
          
          if (!this.data._edit.__giveOwnershipInteraction) this.methods.editEditorsCancelLegOwnership();
          this.data._edit.__giveOwnershipInteraction = false;

          this.data._edit.selectpage = selectpage ?? 0;
        },
        embeds: function() {
          return this.pages.find(page => page.name == 'ship-edit')?.embeds.apply(this, arguments);
        },
        files: function() {
          return this.pages.find(page => page.name == 'ship-edit')?.files.apply(this, arguments);
        },
        components: function() {
          let ship = this.data.ships[this.data._edit.index];

          let EditorsPages = ship.editors.unique().chunkOf(25);
          
          let hasMultiplePages = EditorsPages.length > 1
          let isAuthor = ship.author === this.element.member.id;

          return [
            [
              {
                emoji: "➕",
                label: "Ajouter",
                action: async function({ interaction }) {
                  if (!this.members.includes(interaction.user.id)) return false;

                  if (this.data._edit._LockAddEditorButton) return false;
                  this.data._edit._LockAddEditorButton = true;

                  interaction.deferUpdate();

                  let allowedMembers = this.pages[this.page]?.allowedMembers ?? [];

                  const filter = (collect) => {
			              if (![...this.members, ...allowedMembers].includes(interaction.user.id)) return false;
                    if (collect.content.toLowerCase().simplify().indexOf(cancelationWord.toLowerCase().simplify()) > -1) return true;
                    return this.members.includes(collect.author.id) && collect.mentions.users.keys().array().length > 0;
                  }

                  let cancelationWord = this.methods.getRandomCancelationPassword();

                  let instruction = await interaction.channel.send({
                    content: `_${interaction.user} Mentionnez touts les utilisateurs supplémentaire qui auront accès à la modification de ce ship.\nOu tapez \`${cancelationWord}\` pour annuler._`
                  });
                  let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(c => c).catch(() => null);
                  
                  instruction.delete().catch(noop);

                  await collected.values().array().flatMap(async (collect) => {
                    let ids = collect.mentions.users.keys().array();
                    
                    ship.editors = [...ship.editors, ...ids].unique().filter(id => id !== ship.author);

                    collect.delete().catch(noop);
                  }).promise();

                  this.data._edit._LockAddEditorButton = false;

                  return true;
                },
                disabled: !isAuthor
              },
              {
                emoji: '🗑️',
                label: "Supprimer",
                action: async function() {
                  ship.editors = ship.editors.filter(e => e !== this.data._edit.selectedEditor);
                  this.data._edit.selectedEditor = null;
                  return true;
                },
                disabled: !isAuthor || typeof this.data._edit.selectedEditor !== 'string'
              },
            ],
            [
              {
                type: ComponentType.StringSelect,
                placeholder: "Selection d'un editeur",
                options: ship.editors.length > 0
                  ? EditorsPages[this.data._edit.selectpage].map((editor, index) => ({
                    label: `${(index + 1) + (this.data._edit.selectpage * 25)}. ${ResolveUser(client, editor) ?? `<@${editor}>`}`,
                    value: editor,
                    default: editor === this.data._edit.selectedEditor
                  }))
                  : [{ label: "Aucun editeur selectionnable", value: "missingno", default: true }]
                ,
                action: function({ interaction }) {
                  this.data._edit.selectedEditor = interaction.values[0];
                  return true;
                },
                disabled: !isAuthor
              }
            ],
            [
              {
                emoji: '🤝',
                label: this.data._edit.__giveOwnership ? "Confirmer le legs" : "Léguer la propriété",
                style: this.data._edit.__giveOwnership ? ButtonStyle.Primary : ButtonStyle.Secondary,
                action: async function({ interaction }) {
                  if (this.data._edit.__giveOwnership) {
                    ship.editors = [...ship.editors, ship.author].unique().filter(id => id !== this.data._edit.selectedEditor);
                    ship.author = this.data._edit.selectedEditor;
                    this.data._edit.selectedEditor = null;

                    await ship.save();
                    
                    this.methods.editEditorsCancelLegOwnership();
                  } else {
                    this.data._edit.__giveOwnershipMessage = await interaction.channel.send({
                      content: `_${interaction.user} :warning: : vous ne pourrez plus récupérer la propriété. Voulez-vous continuer ?\nAppuyez de nouveau pour confirmer_`
                    });

                    this.data._edit.__giveOwnershipInteraction = true;

                    this.data._edit.__giveOwnership = setTimeout(() => {
                      this.methods.editEditorsCancelLegOwnership();
                      this.update(interaction);
                    }, 10_000);
                  }

                  return true;
                },
                disabled: !isAuthor || typeof this.data._edit.selectedEditor !== 'string'
              },
            ],
            [
              {
                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                label: "\u200b",
                action: function() {
                  this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) - 1, 0, EditorsPages.length - 1);
                  return true;
                },
                disabled: !isAuthor || !hasMultiplePages || this.data._edit.selectpage < 1
              },
              {
                label: `${this.data._edit.selectpage + 1}/${EditorsPages.length}`,
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                    .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._edit.selectpage ?? 0) + 1 })
                  ;
                  
                  let result = await modal.setInteraction(interaction).popup();
                  if (!result || isNaN(result.get('number'))) return false;
  
                  this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) + 1, 0, EditorsPages.length - 1);
  
                  return true;
                },
                style: ButtonStyle.Secondary,
                disabled: !isAuthor || !hasMultiplePages
              },
              {
                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                label: "\u200b",
                action: function() {
                  this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) + 1, 0, EditorsPages.length - 1);
                  return true;
                },
                disabled: !isAuthor || !hasMultiplePages || this.data._edit.selectpage >= EditorsPages.lastIndex
              },
            ],
            [
              {
                label: "Retour",
                action: function() {
                  this.methods.editEditorsCancelLegOwnership();
                  this.goto('ship-edit');
                  return true;
                }
              },
            ],
          ];
        },
      },      
      {
        name: 'ship-edit-universes',
        beforeUpdate: function() {
          let { selectpage } = this.data._edit;
          
          
          this.data._edit.selectpage = selectpage ?? 0;
        },
        embeds: function() {
          return this.pages.find(page => page.name == 'ship-edit')?.embeds.apply(this, arguments);
        },
        files: function() {
          return this.pages.find(page => page.name == 'ship-edit')?.files.apply(this, arguments);
        },
        components: function() {
          let ship = this.data.ships[this.data._edit.index];

          let UniversesPages = ship.universes.unique().chunkOf(25);
          
          let hasMultiplePages = UniversesPages.length > 1

          return [
            [
              {
                emoji: "➕",
                label: "Ajouter",
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Ajout d'un nouvel univers", time: 120_000 })
                    .addRow().addTextField({ name: 'name', label: "Nom de l'univers", placeholder: "Voice Line City" });
                  ;

                  let result = await modal.setInteraction(interaction).popup();
                  if (!result) return false;

                  if (ship.universes.some(universe => universe.toLowerCase().simplify() === result.get('name').toLowerCase().simplify())) return false;

                  ship.universes.push(result.get('name'));

                  return true;
                }
              },
              {
                emoji: '✏',
                label: "Modifier",
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Modification", time: 120_000 })
                    .addRow().addTextField({ name: 'name', label: "Nom de l'univers", placeholder: "Voice Line City", value: ship.characters[this.data._edit.selectedIndex] });
                  ;

                  let result = await modal.setInteraction(interaction).popup();
                  if (!result) return false;

                  ship.universes[this.data._edit.selectedUniverse] = result.get('name');

                  return true;
                },
                disabled: typeof this.data._edit.selectedUniverse !== 'number'
              },
              {
                emoji: '🗑️',
                label: "Supprimer",
                action: async function() {
                  ship.universes = ship.universes.filter((e,i) => i !== this.data._edit.selectedUniverse);
                  this.data._edit.selectedUniverse = null;
                  return true;
                },
                disabled: typeof this.data._edit.selectedUniverse !== 'number'
              },
            ],
            [
              {
                type: ComponentType.StringSelect,
                placeholder: "Selection d'un univers",
                options: ship.universes.length > 0
                  ? UniversesPages[this.data._edit.selectpage].map((universe, index) => ({
                    label: `${(index + 1) + (this.data._edit.selectpage * 25)}. ${universe}`,
                    value: ''+ index + (this.data._edit.selectpage * 25),
                    default: universe === this.data._edit.selectedUniverse
                  }))
                  : [{ label: "Aucun univers selectionnable", value: "missingno", default: true }]
                ,
                action: function({ interaction }) {
                  this.data._edit.selectedUniverse = Number(interaction.values[0]);
                  return true;
                },
              }
            ],
            [
              {
                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                label: "\u200b",
                action: function() {
                  this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) - 1, 0, UniversesPages.length - 1);
                  return true;
                },
                disabled: !hasMultiplePages || this.data._edit.selectpage < 1
              },
              {
                label: `${this.data._edit.selectpage + 1}/${UniversesPages.length}`,
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                    .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._edit.selectpage ?? 0) + 1 })
                  ;
                  
                  let result = await modal.setInteraction(interaction).popup();
                  if (!result || isNaN(result.get('number'))) return false;
  
                  this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) + 1, 0, UniversesPages.length - 1);
  
                  return true;
                },
                style: ButtonStyle.Secondary,
                disabled: !hasMultiplePages
              },
              {
                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                label: "\u200b",
                action: function() {
                  this.data._edit.selectpage = Math.clamp((this.data._edit.selectpage || 0) + 1, 0, UniversesPages.length - 1);
                  return true;
                },
                disabled: !hasMultiplePages || this.data._edit.selectpage >= UniversesPages.lastIndex
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
      },
    ]
  });
  
  await MenuGameSmashOrPass.send();
  await MenuGameSmashOrPass.handle();
}
