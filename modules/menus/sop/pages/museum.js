import { SOP_PERMISSION } from "#constants";
import { isString, selfnoop, ValidateArray } from "#modules/Utils";
import { ButtonStyle, ComponentType } from "discord.js"
import { GetCachedOutfitAttachment, GetCachedOutfitAttachmentPreview, GetNavBar, NumerotedListToColumns, SortByName, SortByReversedName, SortByRatio, SortByReversedRatio } from "../shared.js";
import { dbManager } from "#modules/database/Manager";
import Emotes from "#modules/Emotes";

function CalcScore({ smashed = 0, passed = 0, super_smashed = 0, super_passed = 0 } = {}) {

  const totalSmash = smashed + (super_smashed * 2);
  const totalPass = passed + (super_passed * 2);
          
  const totalVolume = totalSmash + totalPass;

  let score, ratio;
  if (totalVolume === 0) {
    score = 0;
    ratio = 0;
  } else {
    score = totalSmash - totalPass;
    ratio = Math.round(((totalSmash - totalPass) / totalVolume) * 100) / 100;
  };

  return {
    smashed, passed, super_smashed, super_passed,
    totalSmash, totalPass, totalVolume,
    score, ratio,
  }
}

export default [
  {
    name: "museum-select",
    beforeUpdate: function() {
      if (!this.data._museum) {
        const readable = this.data.groups.filter(g => g.can(SOP_PERMISSION.READ))
        this.data._museum = { readable, page: 0, pages: readable.chunkOf(25), navspeed: 0 };
        
        this.data._museum.mapped = {};
        this.data._museum.readable.forEach(g => this.data._museum.mapped[g.slug] = g.name);
      }

      this.data._museum.slug = null;
    },
    components: function() {
      const sttgs = this.data._museum;
      const displayOptions = this.data.displayOptions;

      return [
        {
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            [
              "# Musée des personnages",
              "Selectionne une collection de personnages",
              !sttgs.slug ? [
                "## Groupes",
                sttgs.readable.length > 0 ? [
                  `Tu peux regarder ${sttgs.readable.length} collections !`,
                  NumerotedListToColumns(sttgs.pages[sttgs.page]?.map((e,i) => `${(i+1)+(sttgs.page*25)}. ${e.name}`) , displayOptions.numberOfColumn),
                ] : [
                  `Il n'y a aucun groupe que tu peux inspecter.`
                ]
              ] : [
                `## ${sttgs.mapped[sttgs.slug] || 'Unknown Group'}`,
                "## Personnages",
                `Il existe ${sttgs.characters.length} personnages dans cette collection.`,
              ],
            ].flat(Infinity).filter(isString),
            '.---',
            [{
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez la collection de personnages",
              min_values: 0, max_values: 1,
              disabled: sttgs.readable.length === 0,
              options: ValidateArray(sttgs.pages[sttgs.page], []).length > 0
                ? sttgs.pages[sttgs.page].map((e,i) => ({ label: `${(i+1)+(sttgs.page*25)}. ${e.name}`, value: e.slug, default: sttgs.slug == e.slug }))
                : [{ label: "Aucune collection à afficher", value: "none", default: true }]
              ,
              action: async function({ interaction }) {
                sttgs.slug = interaction.values[0];
                sttgs.characters = await dbManager.SOP.character.getAll(sttgs.slug);
                this.goto("museum-view");
                return true;
              },
            }],
            !sttgs.slug && sttgs.pages.length > 1 ? [
              GetNavBar(sttgs)
            ] : null,
            [
              {
                emoji: '🏠',
                label: "Home",
                action: function() {
                  delete this.data._museum;
                  this.goto('home');
                  return true;
                }
              },
              { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
            ],
          ]
        }
      ]
    }
  },
  {
    name: "museum-view",
    beforeUpdate: async function() {
      if (!this.data._museum._view) {
        const characters = this.data._museum.characters.map(character => {
          const { smashed, passed, super_smashed, super_passed, score, ratio } = CalcScore(character.stats);

          character.score = score;
          character.ratio = ratio;

          const variations = [
            // Cas extrêmes (Zéro absolu)
            { check: () => smashed === 0 && super_smashed === 0, msg: `${character?.name} n’a encore fait succomber personne à ses charmes... 😔` },
            { check: () => passed === 0 && super_passed === 0, msg: `${character?.name} est l'incarnation du désir, personne ne lui résiste 💘` },

            // Équilibre
            { check: () => smashed === passed, msg: `${character?.name} est un mystère ambulant... il/elle partage le monde en deux 🤔` },

            // Dominance des PASS (Vinaigre / Rejet) - Du plus fort au plus faible
            { check: () => passed >= smashed * 5, msg: `La Friendzone a clairement adopté ${character?.name} 🛑💔` },
            { check: () => passed >= smashed * 4, msg: `${character?.name} s’est fait ghoster plus souvent qu’un vieux compte Tinder 👻` },
            { check: () => passed >= smashed * 3, msg: `Wow... même un cactus est plus abordable que ${character?.name} 🌵` },
            { check: () => passed >= smashed * 2, msg: `On dirait que ${character?.name} est plus controversé(e) qu’une pizza à l’ananas 🍍` },

            // Dominance des SMASH (Séduction / Charme) - Du plus fort au plus faible
            { check: () => smashed >= passed * 5, msg: `${character?.name} est une tornade de séduction, rien ne lui résiste 🌪️🔥` },
            { check: () => smashed >= passed * 4, msg: `La légende raconte que même les statues smashent ${character?.name} 🗿❤️` },
            { check: () => smashed >= passed * 3, msg: `${character?.name} est tellement irrésistible que les Cupidons font des heures sup’ 💘` },
            { check: () => smashed >= passed * 2, msg: `${character?.name} pourrait écrire un livre : "Comment séduire en 10 leçons" 📚` },
          ];
          
          character.comment = variations.find(v => v.check())?.msg || `${character?.name} trace sa route tranquillement...`;

          return character;
        }).sort(SortByName);

        this.data._museum._view = {
          sorted: "alphabet",
          group: this.data._museum.mapped[this.data._museum.slug],
          character: null, outfit: null, arc: null,
          characters: {
            list: characters, mapped: {},
            page: 0, pages: characters.chunkOf(25), navspeed: 0,
          },
          arcs: null, outfits: null, 
        }
        
        this.data._museum._view.characters.list.forEach(character => {
          this.data._museum._view.characters.mapped[character.uid] = character;
        });
      }

      const sttgs = this.data._museum._view;

      if (sttgs.character) {
        if (!sttgs.arcs) {
          const arcs = sttgs.character.arcs.sort(SortByName);
          sttgs.arcs = {
            list: arcs, mapped: {},
            page: 0, pages: arcs.chunkOf(25), navspeed: 0,
          };
          sttgs.character.arcs.forEach(arc => sttgs.arcs.mapped[arc.id] = arc);
        }
        if (!sttgs.outfits) {
          const outfits = sttgs.character.outfits.map(outfit => {
            const { score, ratio } = CalcScore(outfit.stats);
            
            outfit.score = score;
            outfit.ratio = ratio;

            return outfit;
          }).sort(SortByName);
          sttgs.outfits = {
            list: outfits, mapped: {},
            page: 0, pages: outfits.chunkOf(25), navspeed: 0,
          };
          sttgs.character.outfits.forEach(outfit => sttgs.outfits.mapped[outfit.id] = outfit);
        }
      } else {
        sttgs.outfit = null;
        sttgs.arc = null;
      }

      if (sttgs.outfit) {
        sttgs.arc = sttgs.arcs.mapped[sttgs.outfit.arc] ?? null;
      }

      sttgs.attachments = [];
      
      if (sttgs.outfit) {
        sttgs.attachments.push(GetCachedOutfitAttachment(sttgs.outfit));
      } else
      if (sttgs.character) {
        if (sttgs.character.outfits.length > 0) {
          sttgs.attachments = await Promise.all(sttgs.outfits.list.toSorted(() => Math.random() > 0.5 ? 1 : -1).slice(0,9).map(outfit => GetCachedOutfitAttachmentPreview(outfit)));
        } else {
          sttgs.attachments.push(GetCachedOutfitAttachment());
        }
      }
    },
    files: function() {
      const sttgs = this.data._museum._view;
      return sttgs.attachments;
    },
    components: function() {
      const sttgs = this.data._museum._view;
      const displayOptions = this.data.displayOptions;

      const GALLERIES = sttgs.attachments.length === 0 ? [] : sttgs.attachments.chunkOf(10).map(attachments => {
        return {
          type: ComponentType.MediaGallery,
          items: attachments.map(attachment => ({ media: { url: `attachment://${attachment.name}` } }))
        }
      });

      const sorts = {
        random: "Aléatoire",
        shuffle: "Remélanger la liste",
        ratio: "Popularité",
        anti_ratio: "Impopularité",
        alphabet: "Alphabétique (a-z)",
        anti_alphabet: "Alphabétique (z-a)",
      };

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# Musée des personnages",
            !sttgs.character
              ? [
                "Selectionne un personnage",
                NumerotedListToColumns(sttgs.characters.pages[sttgs.characters.page].map((e,i) => `${(i+1)+(sttgs.characters.page*25)}. ${e.name}`), displayOptions.numberOfColumn),
              ]
              : [
                `## ${sttgs.character.name}`,
                `Créer par <@${sttgs.character.rules.owner}>`,
                !sttgs.outfit && [
                  "Selectionnez une tenue pour la visualiser",
                  NumerotedListToColumns(sttgs.outfits.pages[sttgs.outfits.page]?.map((e,i) => `${(i+1)+(sttgs.outfits.page*25)}. ${e.name}`), displayOptions.numberOfColumn),
                ],
                sttgs.outfit && `### ${sttgs.outfit.name}`,
                sttgs.arc && `### ${sttgs.arc.name}`,
                sttgs.outfit?.artist?.name && `Visuel créer par ${ sttgs.outfit?.artist?.link ? `[${sttgs.outfit?.artist?.name}](${sttgs.outfit?.artist?.link})` : sttgs.outfit?.artist?.name }`,
              ]
            ,
          ].flat(Infinity).filter(isString),

          !sttgs.outfit && sttgs.character?.description && {
            type: ComponentType.TextDisplay,
            content: `### Description du personnage\n` + sttgs.character.description.limit(1000),
          },
          
          sttgs.arc && sttgs.arc?.description && {
            type: ComponentType.TextDisplay,
            content: `### Description de l'arc narratif\n` + sttgs.arc.description.limit(1000),
          },
          sttgs.outfit && sttgs.outfit?.description && {
            type: ComponentType.TextDisplay,
            content: `### Description de la tenue\n` + sttgs.outfit.description.limit(1000),
          },

          sttgs.character && [
            !sttgs.outfit ? [
              "### Stats du personnage",
              `- Nombre de fois Smashé·e : ${sttgs.character.stats.smashed}`,
              `- Nombre de fois Passé·e : ${sttgs.character.stats.passed}`,
              `- Nombre de fois Super Smashé·e : ${sttgs.character.stats.super_smashed}`,
              `- Nombre de fois Super Passé·e : ${sttgs.character.stats.super_passed}`,
              `Ratio de popularité : ${sttgs.character.ratio}`,
              `Score total : ${sttgs.character.score}`,
            ] : [
              "### Stats de la tenue",
              `- Nombre de fois Smashé·e : ${sttgs.outfit.stats.smashed}`,
              `- Nombre de fois Passé·e : ${sttgs.outfit.stats.passed}`,
              `- Nombre de fois Super Smashé·e : ${sttgs.outfit.stats.super_smashed}`,
              `- Nombre de fois Super Passé·e : ${sttgs.outfit.stats.super_passed}`,
              `Ratio de popularité : ${sttgs.outfit.ratio}`,
              `Score total : ${sttgs.outfit.score}`,
            ],
            "",
            !sttgs.outfit && sttgs.character.comment,
          ].flat(Infinity).filter(isString),

          ...GALLERIES,

          ".---",
          !sttgs.character && [{
            type: ComponentType.StringSelect,
            placeholder: "Selectionnez le mode de trie",
            min_values: 0, max_values: 1,
            options: Object.entries(sorts).map(([value, label]) => {
              if (value === "shuffle" && sttgs.sorted !== "random") return null;
              return { label, value, default: value == sttgs.sorted };
            }).filter(selfnoop),
            action: function({ interaction }) {
              sttgs.sorted = interaction.values[0];

              if (sttgs.sorted === "shuffle") sttgs.sorted = "random";

              if (sttgs.sorted === "random") {
                sttgs.characters.list.sort(() => Math.random() - 0.5);
              } else
              if (sttgs.sorted === "ratio") {
                sttgs.characters.list.sort(SortByRatio);
              } else
              if (sttgs.sorted === "anti_ratio") {
                sttgs.characters.list.sort(SortByReversedRatio);
              } else
              if (sttgs.sorted === "alphabet") {
                sttgs.characters.list.sort(SortByName);
              } else
              if (sttgs.sorted === "anti_alphabet") {
                sttgs.characters.list.sort(SortByReversedName);
              }

              sttgs.characters.pages = sttgs.characters.list.chunkOf(25);

              return true;
            }
          }],


          sttgs.character && [
            {
              emoji: Emotes.GetEmojiObject(Emotes.chevron.white.left.simple),
              label: "\u200b",
              style: ButtonStyle.Secondary,
              disabled: sttgs.characters.list.findIndex(c => c.uid === sttgs.character.uid) < 1,
              action: function() {
                const index = sttgs.characters.list.findIndex(c => c.uid === sttgs.character.uid);
                if (index > 0) {
                  sttgs.outfits = null; sttgs.arcs = null;
                  sttgs.outfit = null; sttgs.arc = null;
                  
                  sttgs.characters.page = Math.floor((index - 1) / 25);
                  sttgs.character = sttgs.characters.list[index - 1];
                  return true;
                }
                return false;
              },
            },
            {
              emoji: Emotes.GetEmojiObject(Emotes.chevron.white.right.simple),
              label: "\u200b",
              style: ButtonStyle.Secondary,
              disabled: sttgs.characters.list.findIndex(c => c.uid === sttgs.character.uid) >= sttgs.characters.list.lastIndex,
              action: function() {
                const index = sttgs.characters.list.findIndex(c => c.uid === sttgs.character.uid);
                if (index < sttgs.characters.list.lastIndex) {
                  sttgs.outfits = null; sttgs.arcs = null;
                  sttgs.outfit = null; sttgs.arc = null;

                  sttgs.characters.page = Math.floor((index + 1) / 25);
                  sttgs.character = sttgs.characters.list[index + 1];
                  return true;
                }
                return false;
              },
            },

            {
              emoji: Emotes.GetEmojiObject(Emotes.chevron.white.left.simple),
              label: "\u200b",
              style: ButtonStyle.Secondary,
              disabled: !sttgs.outfit || sttgs.outfits.list.length === 0 || sttgs.outfits.list.findIndex(c => c.id === sttgs.outfit.id) < 1,
              action: function() {
                const index = sttgs.outfits.list.findIndex(c => c.id === sttgs.outfit.id);
                if (index > 0) {
                  sttgs.arc = null;

                  sttgs.outfits.page = Math.floor((index - 1) / 25);
                  sttgs.outfit = sttgs.outfits.list[index - 1];
                  return true;
                }
                return false;
              },
            },
            {
              emoji: Emotes.GetEmojiObject(Emotes.chevron.white.right.simple),
              label: "\u200b",
              style: ButtonStyle.Secondary,
              disabled: !sttgs.outfit || sttgs.outfits.list.length === 0 || sttgs.outfits.list.findIndex(c => c.id === sttgs.outfit.id) >= sttgs.outfits.list.lastIndex,
              action: function() {
                const index = sttgs.outfits.list.findIndex(c => c.id === sttgs.outfit.id);
                if (index < sttgs.outfits.list.lastIndex) {
                  sttgs.arc = null;

                  sttgs.outfits.page = Math.floor((index + 1) / 25);
                  sttgs.outfit = sttgs.outfits.list[index + 1];
                  return true;
                }
                return false;
              },
            },
          ],
          [{
            type: ComponentType.StringSelect,
            placeholder: "Selectionnez un personnage",
            min_values: 0, max_values: 1,
            disabled: ValidateArray(sttgs.characters.pages[sttgs.characters.page], []).length === 0,
            options: ValidateArray(sttgs.characters.pages[sttgs.characters.page], []).length > 0
              ? sttgs.characters.pages[sttgs.characters.page].map((e,i) => ({ label: `${(i+1)+(sttgs.characters.page*25)}. ${e.name}`, value: e.uid, default: e.uid === sttgs.character?.uid }))
              : [{ label: "Aucun personnage slectionnable.", value: "none", default: true }]
            ,
            action: function({ interaction }) {
              sttgs.outfits = null; sttgs.arcs = null;
              sttgs.outfit = null; sttgs.arc = null;

              sttgs.character = sttgs.characters.mapped[ interaction.values[0] ];
              return true;
            }
          }],

          sttgs.character  && [{
            type: ComponentType.StringSelect,
            placeholder: "Selectionnez une tenue",
            min_values: 0, max_values: 1,
            disabled: ValidateArray(sttgs.outfits.pages[sttgs.outfits.page], []).length === 0,
            options: ValidateArray(sttgs.outfits.pages[sttgs.outfits.page], []).length > 0
              ? sttgs.outfits.pages[sttgs.outfits.page].map((e,i) => ({ label: `${(i+1)+(sttgs.outfits.page*25)}. ${e.name}`, value: e.id, default: e.id === sttgs.outfit?.id }))
              : [{ label: "Aucune tenue slectionnable.", value: "none", default: true }]
            ,
            action: function({ interaction }) {
              sttgs.arc = null;

              sttgs.outfit = sttgs.outfits.mapped[ interaction.values[0] ];
              if (sttgs.outfit?.arc) sttgs.arc = sttgs.arcs.mapped[ sttgs.outfit.arc ];
              return true;
            }
          }],

          !sttgs.character
            ? sttgs.characters.pages.length > 1 && GetNavBar(sttgs.characters)
            : !sttgs.outfit && sttgs.outfits.pages.length > 1 && GetNavBar(sttgs.outfits),
          ,

          [
            {
              emoji: '👈',
              label: "Retour",
              action: function() {
                delete this.data._museum._view;
                this.goto("museum-select");
                return true;
              },
            },
            {
              emoji: { name: "🏠" },
              label: "Menu principal",
              action: function() {
                delete this.data._museum;
                this.goto('home');
                return true
              }
            },
          ]
        ]
      }];
    }
  }
];