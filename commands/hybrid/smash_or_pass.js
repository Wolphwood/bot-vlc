import { ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, AttachmentBuilder, Message } from "discord.js";
import sharp from "sharp";

import { noop, DiscordMenu, ModalForm } from "#modules/Utils";
import { PERMISSION } from "#constants";
import { Locales } from "#modules/Locales"
import Emotes from "#modules/Emotes"
import { dbManager } from "#modules/database/Manager"

import { GameSmashOrPass } from "#modules/menus/sop/index"

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

export default {
  name: "SmashOrPass",
  aliases: ['sop'],
  userPermission: PERMISSION.USER,
  type: ApplicationCommandType.ChatInput,
  options: [
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: "config",
    aliases: ['c', 'conf', 'cfg'],
    description: Locales.get(`commandinfo.smashorpass.option.config.description`),
  },
  {
    type: ApplicationCommandOptionType.Subcommand,
    name: "start",
    description: Locales.get(`commandinfo.smashorpass.option.start.description`),
  },
  ],
  run: async ({client, interaction, message, args, userPermission, GuildData, UserData, LangToUse }) => {
    let discordElement = message ?? interaction;
    let { member } = discordElement;

    let subcommand = args.shift();
    if (!subcommand) subcommand = "start";

    switch (subcommand.toLowerCase().simplify()) {
      case "start":
        await GameSmashOrPass({ client, discordElement, GuildData, UserData, userPermission });
        if (message) message.delete().catch(noop);
      break
      
      case "config":
      case "conf":
      case "cfg":
      case "c":
        if (userPermission < PERMISSION.GUILD_MOD) {
          return discordElement.reply({
          content:  Emotes.cancel +  ` You haven't permission for that`,
          ephemeral: true,
          }).then(e => !e.ephemeral ? Wait(3000).then(() => e.delete()) : null);
        }

        await ConfigCharacters({ client, client, discordElement, GuildData, UserData });

        if (discordElement instanceof Message) {
          message.delete().catch(noop);
        }
      break

      default:
        discordElement.reply({ content: `Unknown sub-command '${subcommand}'` });
      
    }
  },
};

const softFixed = (value) => {
  let fixed = Math.round(value * 100) / 100;
  return isNaN(fixed) ? isNaN(value) ? 0 : value : fixed;
}




async function ConfigCharacters({ client, discordElement, GuildData, UserData }) {
  let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
  let AllCharacters = await dbManager.SOP.character.getAll(GuildData.id);
  loadingEmoteMessage.delete().catch(noop);

  const MenuConfigCharacters = new DiscordMenu({
  element: discordElement,
  collectorOptions: {
    // idle: 2_147_483_647,
    idle: 1_800_000 // 30 minutes
  },
  data: {
    color: {
      red: 0xFF0000,
      green: 0x00FF00,
      blue: 0x0000FF,
      indigo: 0x6558F2,
      magenta: 0xF25865,
      coral: 0xF26558,
      lime: 0x65F258,
    },
    characters: AllCharacters,
    _edit: {
      index: null,
    },
    _create: {
      name: null,
      arc: null,
      group: null,
    },
    _arcs: {
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
  
      const fields = cols.map((col, index) => {
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
          action: async function({ interaction }) {
            let modal = new ModalForm({ title: "Création d'un personnage", time: 120_000 })
            .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: "John Doe" })
            .addRow().addTextField({ name: 'arc', label: "Nom de l'arc du personnage", placeholder: "Normal", value: 'Normal', required: false })
            ;
            
            let result = await modal.setInteraction(interaction).popup();
            if (!result) return false;
    
            let newchar = await dbManager.SOP.character.create({
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
        action: async function({ interaction }) {
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

            let newchar = await dbManager.SOP.character.create(create);
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
          placeholder: Locales.get("command.sop.config.select.select.placeholder"),
          options: CharactersPages[this.data._edit.selectpage].map((character, index) => ({
            label: `${character.name} (${character.arc})`,
            value: character.uid,
          })),
          action: function({ interaction }) {
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
  
      const outfitFields = cols.map((col, index) => {
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
          action: async function({ interaction }) {
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
          emoji: "📖",
          label: "Modifier les arcs",
          action: "goto:edit-arcs"
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
        action: async function({ interaction }) {
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
        { label: "Retour", action: function({ interaction }) {
        if (!this.members.includes(interaction.user.id)) return false;
        this.goto('edit-select');
        return true;
        }},
        { emoji: '🏠', label: "Home", action: function({ interaction }) {
        if (!this.members.includes(interaction.user.id)) return false;
        this.goto('home');
        return true;
        } },
      ]
      ]
    },
    },
    {
      name: "edit-arcs",
      beforeUpdate: function() {
        let character = this.data.characters[this.data._edit.index];
  
        this.data._arcs.index = Math.clamp(
          this.data._arcs.index || 0,
          0, character.arcs.length - 1
        );

        this.data._edit.character = character;
      },
      embeds: function() {
        let character = this.data.characters[this.data._edit.index];
        
        return [{
          title: "Modifications des arcs",
          fields: [
            {
              name: FillString('Arcs Narratif', 32),
              value: character.arcs.map(s => `0. ${s}`).join('\n'),
              inline: true
            },
          ],
          color: 0x5865F2,
        }];
      },
      components: function() {
        return [
          [
            { label: "Retour", action: "goto:edit"},
            {
              emoji: '🏠', label: "Home",
              action: function({ interaction }) {
                if (!this.members.includes(interaction.user.id)) return false;
                this.goto('home');
                return true;
              }
            },
          ]
        ];
      }
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
        action: async function({ interaction }) {
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
        action: async function({ interaction }) {
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
        action: async function({ interaction }) {
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
        action: async function({ interaction }) {
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
                action: async function({ interaction }) {
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
              { emoji: '🏠', label: "Home", action: function({ interaction }) {
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
                placeholder: Locales.get("command.sop.config.remove.select.placeholder"),
                options: CharactersPages[this.data._remove.selectpage].map((character, index) => ({
                  label: `${character.name} (${character.arc})`,
                  value: character.uid,
                })),
                action: function({ interaction }) {
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
                action: function() {
                  this.page._remove.selectpage = Math.clamp(this.page._remove.selectpage - 1, 0, CharactersPages.length);
                  return true;
                }, style: ButtonStyle.Secondary,
                disabled: !hasMultiplePages || this.data._remove.selectpage < 1
              },
              {
                label: `${this.data._remove.selectpage + 1}/${CharactersPages.length}`,
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                    .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._remove.selectpage ?? 0) + 1 })
                  ;
                  
                  let result = await modal.setInteraction(interaction).popup();
                  if (!result || isNaN(result.get('number'))) return false;
                  
                  this.data._remove.selectpage = Math.clamp((this.data._remove.selectpage || 0) + 1, 0, CharactersPages.length - 1);
  
                  return true;
                },
                style: ButtonStyle.Secondary,
                disabled: !hasMultiplePages
              },
              {
                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                label: "\u200b",
                action: function() {
                  this.page._remove.selectpage = Math.clamp(this.page._remove.selectpage + 1, 0, CharactersPages.length);
                  return true;
                }, style: ButtonStyle.Secondary,
                disabled: !hasMultiplePages || this.data._remove.selectpage >= (CharactersPages.length - 1) 
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
                  await dbManager.SOP.character.delete(guild, uid);
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