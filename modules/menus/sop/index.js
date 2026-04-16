import { ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, AttachmentBuilder, Message } from "discord.js";

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

import { noop, DiscordMenu, ModalForm } from "#modules/Utils";
import { Locales } from "#modules/Locales"
import Emotes from "#modules/Emotes"
import { dbManager } from "#modules/database/Manager"

// Trier les personnages par nom
export function SortByName(a,b) {
  const kA = `${a.name} ${a.arc}`.simplify().toLowerCase();
  const kB = `${b.name} ${b.arc}`.simplify().toLowerCase();
  
  if (kA < kB) return -1;
  if (kA > kB) return 1;
  return 0;
}

// Trier les personnages par Ratio
export function SortByRatio(a,b) {
  let rA = softFixed((a.stats.smashed - a.stats.passed) / (a.stats.smashed + a.stats.passed));
  let rB = softFixed((b.stats.smashed - b.stats.passed) / (b.stats.smashed + b.stats.passed));

  if (rA > rB) return -1;
  if (rA < rB) return 1;
  return 0;
}

import PageHome from "./pages/home.js"
import PageSettings from "./pages/settings.js"
import PageTops from "./pages/tops.js"
import PagePlay from "./pages/play.js"

import { SOP_PERMISSION } from "#constants";

export async function GameSmashOrPass({ client, discordElement, GuildData, UserData, userPermission }) {
  let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
  let AllCharacters = await dbManager.SOP.character.getAll();
  let AllGroups = await dbManager.SOP.group.getWithAuth(null, discordElement.member, userPermission);
  loadingEmoteMessage.delete().catch(noop);



  const MenuGameSmashOrPass = new DiscordMenu({
  element: discordElement,
  ephemeral: true,
  collectorOptions: {
    idle: 2_147_483_647
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
    guild: GuildData,
    user: UserData,
    userPermission: userPermission ?? 0,
    characters: AllCharacters.sort(SortByName),
    groups: AllGroups.filter(g => g.can(SOP_PERMISSION.READ)),
    gamemode: 'random',
    count: 0,
    ccount: false,
    _settings: null,
    _museum: null,
    _game: null,
  },
  pages: [
    ...PageHome,
    ...PageSettings,
    ...PageTops,
    ...PagePlay,
  ],
  __pages: [
    

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
          placeholder: Locales.get("command.sop.museum_select.select.placeholder"),
          options: CharactersPages[this.data._museum.selectpage].map((character, index) => ({
            label: `[${(index + 1) + (this.data._museum.selectpage * 25)}] ${character.name} (${character.arc})`,
            value: character.uid,
            // default: this.data._museum.index !== null ? ( this.data.characters[this.data._museum.index]?.uid == character.uid ) : false
          })),
          action: function({ interaction }) {
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
          action: async function({ interaction }) {
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
        label: Locales.get(`command.sop.museum.sorting.button.${m}.label`),
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
        placeholder: Locales.get("command.sop.museum.outfit_select.placeholder"),
        options: (hasOutfits ? OutfitsPages[this.data._museum.selectoutfitpage] : ['(No outfit available)']).map((name, index) => ({
          label: name,
          value: '' + (index + (25 * this.data._museum.selectoutfitpage)),
          default: (!hasOutfits) || index === this.data._museum.outfitindex
        })),
        action: function({ interaction }) {
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
        action: async function({ interaction }) {
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
        { label: "Retour", action: function({ interaction }) {
        if (!this.members.includes(interaction.user.id)) return false;
        this.goto('museum-select');
        return true;
        }},
        { emoji: '🏠', label: "Home", action: function({ interaction }) {
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
        value: Locales.get(`command.sop.play.setup.field.value.mode.${this.data.gamemode}`, [this.data.count || this.data.characters.length]),
        }
      ],
      color: 0x5865F2,
      }];
    },
    components: function() {
      return [
      ['random', 'famous', 'unfamous'].map(value => {
        return {
        label: Locales.get(`command.sop.play.setup.button.mode.${value}`),
        style: this.data.gamemode === value ? ButtonStyle.Primary : ButtonStyle.Secondary,
        action: async function({ interaction }) {
          this.data.gamemode = value;
          return true;
        },
        };
      }),
      [10,25,50].map(value => {
        return {
        label: Locales.get(`command.sop.play.setup.button.count.character`, [value]),
        style: !this.data.ccount && this.data.count === value ? ButtonStyle.Primary : ButtonStyle.Secondary,
        action: async function({ interaction }) {
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
        action: async function({ interaction }) {
          this.data.count = 0;
          this.data.ccount = false;
          return true;
        },
        },
        {
        label: this.data.ccount ? `Valeur personnalisée : ${this.data.count}` : "Valeur personnalisée",
        style: this.data.ccount ? ButtonStyle.Primary : ButtonStyle.Secondary,
        action: async function({ interaction }) {
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
        { emoji: '🏠', label: "Home", action: function({ interaction }) {
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

      smashed.forEach(c => dbManager.SOP.character.smash(c.guild, c.uid));
      passed.forEach(c => dbManager.SOP.character.pass(c.guild, c.uid));

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
  await MenuGameSmashOrPass.handle({ client });
}

export function GetNavBar(sttgs) {
  const SetPage = (value) => {
    const w = sttgs.page;
    sttgs.page = Math.clamp(value, 0, sttgs.pages.lastIndex);
    return sttgs.page !== w;
  }
  const PrevPage = () => {
    return SetPage(sttgs.page - [1,5,10][sttgs.navspeed]);
  }
  const NextPage = () => {
    return SetPage(sttgs.page + [1,5,10][sttgs.navspeed]);
  }

  const DecreaseNavSpeed = () => {
    sttgs.navspeed--;
    return true;
  }
  const IncreaseNavSpeed = () => {
    sttgs.navspeed++;
    return true;
  }

  let iconType = ['simple','double','triple'][sttgs.navspeed];

  return [
    { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left[iconType]), label: "\u200b", action: PrevPage, style: ButtonStyle.Secondary, disabled: sttgs.page < 1 },
    
    { emoji: "➖", label: "\u200b", action: DecreaseNavSpeed, style: ButtonStyle.Secondary, disabled: sttgs.navspeed <= 0 },
    
    { emoji: Emotes.GetEmojiObject(Emotes.compass.black), label: "\u200b", action: async ({interaction}) => {
      let modal = new ModalForm({ title: "Aller à une page", time: 120_000 })
        .addRow().addTextField({ name: 'number', label: "Numero de page", placeholder: `1-${sttgs.pages.length}` })
      ;
      
      let result = await modal.setInteraction(interaction).popup();
      if (!result || isNaN(result.get('number'))) return false;

      return SetPage(Number(result.get('number')) - 1);
    }, style: ButtonStyle.Secondary },
    
    { emoji: "➕", label: "\u200b", action: IncreaseNavSpeed, style: ButtonStyle.Secondary, disabled: sttgs.navspeed >= 2 },
    
    { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right[iconType]), label: "\u200b", action: NextPage, style: ButtonStyle.Secondary, disabled: sttgs.page >= sttgs.pages.lastIndex},
  ]
}

const AttachmentCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en millisecondes

/**
 * Récupère ou crée un Attachment avec auto-nettoyage
 */
export function GetCachedAttachment(cacheKey, filename, filepath) {
  if (!filename) return null;

  if (AttachmentCache.has(cacheKey)) {
    const cached = AttachmentCache.get(cacheKey);
    
    clearTimeout(cached.timeout);
    cached.timeout = setTimeout(() => AttachmentCache.delete(cacheKey), CACHE_TTL);
    
    return cached.attachment;
  }

  const attachment = new AttachmentBuilder(filepath, { 
    name: filename
  });

  const timeout = setTimeout(() => AttachmentCache.delete(cacheKey), CACHE_TTL);
  AttachmentCache.set(cacheKey, { attachment, timeout });

  return attachment;
}

export function GetCachedOutfitAttachment(outfit) {
  if (!outfit)
    return GetCachedAttachment('outfit_noimg', 'noimg.png', './assets/noimg.png');

  const cacheKey = `outfit_${outfit.filename}`;

  const filepath = `./assets/sop/outfits/${outfit.filename}`;

  if (!fs.existsSync(filepath)) 
    return GetCachedAttachment('outfit_brokenlink', 'brokenlink.png', './assets/brokenlink.png');
  
  return GetCachedAttachment(cacheKey, outfit.filename, filepath);
}

export async function GetCachedOutfitAttachmentPreview(outfit) {
  if (!outfit || !outfit.filename)
    return GetCachedAttachment('preview_noimg', 'preview_noimg.png', './assets/preview_noimg.png');

  const sourcePath = `./assets/sop/outfits/${outfit.filename}`;
  const previewFilename = `${outfit.filename.split('.')[0]}.png`;
  const previewPath = `./assets/sop/outfits/previews/${previewFilename}`;
  const cacheKey = `outfit_preview_${previewFilename}`;

  if (!fs.existsSync(sourcePath)) {
    return GetCachedAttachment('preview_brokenlink', 'preview_brokenlink.png', './assets/preview_brokenlink.png');
  }

  if (!fs.existsSync(previewPath)) {
    try {
      const dir = path.dirname(previewPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      await sharp(sourcePath)
        .resize(128, 128, { fit: 'cover' })
        .png()
        .toFile(previewPath);
    } catch (err) {
      console.error(`Erreur resize pour ${outfit.filename}:`, err);
      return GetCachedAttachment('preview_brokenlink', 'preview_brokenlink.png', './assets/preview_brokenlink.png');
    }
  }

  return GetCachedAttachment(cacheKey, previewFilename, previewPath);
}

export function NumerotedListToColumns(list, count) {
  if (!list) return "```\u200b```";
  if (list.length <= count) return "```\n"+ list.join(' | ') +"\n```";
  
  const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });
  
  const getVisualLength = (str) => {
    if (!str) return 0;
    return [...segmenter.segment(str)].length;
  };

  const size = Math.ceil(list.length / count);
  const columns = Array.from(Array(count), (e, i) => list.slice(size * i, size * (i + 1)));

  const widths = columns.map(col => 
    col.length > 0 ? Math.max(...col.map(s => getVisualLength(s))) + 1 : 0
  );

  const compensate = (str) => !str ? '' : /^[0-9]\./g.test(str) ? " " + str : str;

  const text = Array.from(Array(size), (e, i) => Array.from(Array(count), (ee, ii) => {
    const c = compensate(columns[ii][i]);
    const cLen = getVisualLength(c);
    return [ c + " ".repeat(Math.max(0, widths[ii] - cLen)), '│' ];
  }).flat().slice(0, -1).join(' ').trimEnd()).join('\n');

  return "```\n" + text + "\n```";
}