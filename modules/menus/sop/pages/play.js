import { ComponentType, ButtonStyle, AttachmentBuilder } from "discord.js"
import { Locales } from "#modules/Locales"

import { GetCachedOutfitAttachment, GetNavBar, NumerotedListToColumns } from "../index.js";
import { isDefined, isNull, isString, ModalForm, selfnoop as sn, ValidateArray } from "#modules/Utils";
import { dbManager } from "#modules/database/Manager";
import { SOP_PERMISSION } from "#constants";
import Emotes from "#modules/Emotes";

export default [
  {
    name: "game-setup",
    beforeUpdate: function() {
      if (!this.data._game) {
        this.data._game = {
          page: 0,
          navspeed: 0,
          count: 'all',
          counts: {
            'count_5': 5,
            'count_10': 10,
            'count_25': 25,
            'count_50': 50,
            'count_100': 100,
            'all': this.data.characters.length,
            'custom': this.data.characters.length,
            'define': null,
          },
          sort: 'random',
        };
      }
      
      const sttgs = this.data._game;

      if (sttgs.characters) {
        sttgs.counts.all = sttgs.characters.length;
        sttgs.counts.custom = Math.min(sttgs.counts.all, sttgs.counts.custom);
      }

      this.data._game.pages = this.data.groups.filter(g => g.can(SOP_PERMISSION.PLAY)).chunkOf(25);
    },
    components: function() {
      const sttgs = this.data._game;
      const sorts = {
        random: "Aléatoire",
        ratio: "Popularité",
        anti_ratio: "Impopularité",
        alphabet: "Alphabétique (a-z)",
        anti_alphabet: "Alphabétique (z-a)",
      }

      return [{
        type: ComponentType.Container,
        components: [
          [
            "# 🥵  𝗦 𝗠 𝗔 𝗦 𝗛  𝗢 𝗥  𝗣 𝗔 𝗦 𝗦  🥶",
            "Dans ce jeu interactif hilarant, il ne s'agit pas de combat, mais de décisions!",
            `Affrontez un défilé de personnages hauts en couleur, chacun avec ses traits distinctifs, et répondez à la question fatidique : Smash or Pass ?.`,
            
            !sttgs.slug ? [
              "## Groupes",
              `Il existe ${this.data.groups.length} collections !`,
              NumerotedListToColumns(sttgs.pages[sttgs.page].map((e,i) => `${(i+1)+(sttgs.page*25)}. ${e.name}`) , 2),
            ] : [
              "## Personnages",
              `Il existe ${this.data.characters.length} personnages !`,
            ],
            
            sttgs.slug && [
              "## Configuration de la partie",
              `- Nombre de personnages : ${sttgs.counts[sttgs.count]}`,
              `- Tri des personnages : ${sorts[sttgs.sort]}`,
              "",
            ],
            
            !sttgs.slug && `-# Vitesse de navigation : ±${[1,5,10][sttgs.navspeed]} | Page ${sttgs.page+1}/${Math.max(1,sttgs.pages.length)}`,
          ].flat().filter(isString),
          '.===',
          [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez la collection de personnages",
              min_values: 0, max_values: 1,
              options: ValidateArray(sttgs.pages[sttgs.page], []).length > 0 ?
              sttgs.pages[sttgs.page].map((group, index) => ({
                label: `${(index + 1) + (25 * sttgs.page)}. ${group.name}`,
                value: group.slug,
                default: sttgs.slug == group.slug
              })) : [{ label: "Aucune collection à afficher", value: "none", default: true }],
              disabled: ValidateArray(sttgs.pages[sttgs.page], []).length === 0,
              action: async function({ interaction }) {
                sttgs.slug = interaction.values[0];
                sttgs.characters = await dbManager.SOP.character.getAll(sttgs.slug);
                // sttgs.availables = await dbManager.SOP.character.count({ group_slug: sttgs.slug });
                return true;
              },
            }
          ],
          !sttgs.slug && sttgs.pages.length > 1 ? [
            GetNavBar(sttgs)
          ] : null,
          sttgs.slug ? [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez le nombre de personnages",
              min_values: 0, max_values: 1,
              options: Object.entries(sttgs.counts).map(([key, value]) => {
                if (key.startsWith("count") && (value > sttgs.characters.length)) return null;

                let label = `${value} Personnage(s)`;
                if (key == 'all') label = `Tout les personnages : ${value}`;
                if (key == 'custom') label = `Valeur personalisée : ${value}`;
                if (key == 'define') label = `Redéfinir la valeur personnalisé`;

                if (key == "define" && sttgs.count !== 'custom') return null;

                return {
                  label, value: key,
                  default: key == sttgs.count
                };
              }).filter(sn),
              action: async function({ interaction }) {
                sttgs.count = interaction.values[0];
                if (sttgs.count == 'define') sttgs.count = "custom";

                if (sttgs.count == 'custom') {
                  let modal = new ModalForm({ title: "Indiquez le nombre de personnages", time: 120_000 })
                    .addRow().addTextField({ name: 'number', label: "Nombre", placeholder: sttgs.counts.custom, value: sttgs.counts.custom })
                  ;
                  
                  let result = await modal.setInteraction(interaction).popup();
                  if (!result || !result.get('number')) return false;
                  
                  sttgs.counts.custom = Math.clamp(Number(result.get('number')), 1, sttgs.counts.all);
                }

                return true;
              },
            }
          ] : null,
          sttgs.slug ? [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez le mode de tri",
              min_values: 0, max_values: 1,
              options: Object.entries(sorts).map(([value, label]) => {
                return {
                  label, value,
                  default: value == sttgs.sort
                };
              }),
              action: async function({ interaction }) {
                sttgs.sort = interaction.values[0];
                return true;
              },
            }
          ] : null,
          sttgs.slug ? [
            {
              label: "Lancer la partie",
              style: ButtonStyle.Success,
              disabled: !sttgs.sort || !sttgs.count,
              action: async function() {
                
                let chrs = await dbManager.SOP.character.getSorted({
                  limit: sttgs.counts[sttgs.count],
                  sort: sttgs.sort,
                  filter: {
                    group_slug: sttgs.slug
                  }
                });

                this.data._game._run = {
                  characters: [...chrs],
                  character: null,
                  attachments: [],
                  arc: null,
                  outfit: null,
                  smashed: [],
                  passed: [],
                };

                this.goto('game-run');

                return true;
              },
            },
          ] : null,
          [
            {
              emoji: '🏠',
              label: "Home",
              action: function() {
                delete this.data._game;
                this.goto('home');
                return true;
              }
            },
            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
          ],
        ] 
      }];
    }
  },
  {
    name: "game-run",
    beforeUpdate: async function() {
      const sttgs = this.data._game._run;

      sttgs.character = null;
      sttgs.outfit = null;
      sttgs.arc = null;
      sttgs.attachments = [];

      if (sttgs.characters.length === 0) {
        this.goto("game-end");
        return false;
      }

      sttgs.character = sttgs.characters.outRandomElement();
      
      if (!sttgs.character) {
        this.handleError(new Error("sttgs.character is undefined"));
        this.goto("game-end");
        return false;
      }
      
      if (sttgs.character.outfits.length > 0) {
        sttgs.outfit = sttgs.character.outfits.getRandomElement();
      }
      
      // Récupérer l'arc
      if (sttgs.outfit?.arc) {
        sttgs.arc = sttgs.character.arcs.find(arc => arc.id === sttgs.outfit.arc);
      }
      
      // Récupéré l'attachment (outfit, noimg ou brokenlink)
      sttgs.attachments = await Promise.all([
        GetCachedOutfitAttachment(sttgs.outfit)
      ]);
    },
    files: function() {
      const sttgs = this.data._game._run;
      return sttgs.attachments;
    },
    components: function() {
      const sttgs = this.data._game._run;

      const GALLERIES = sttgs.attachments.length === 0 ? [] : sttgs.attachments.chunkOf(10).map(attachments => {
        return {
          type: ComponentType.MediaGallery,
          items: attachments.map(attachment => ({ media: { url: `attachment://${attachment.name}` } }))
        }
      });

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# 🥵 SMASH OR PASS 🥶",
            `## ${ sttgs.character.name || 'John Doe' }`,
            sttgs.outfit ? (sttgs.arc ? `### ${sttgs.outfit.name} (${sttgs.arc.name})` : `## ${sttgs.outfit.name}`) : '## Pas visuel disponible.',
            sttgs.outfit?.artist?.name ? (sttgs.outfit.artist.link ? `**[${sttgs.outfit.artist.name}](${sttgs.outfit.artist.link})**` : `**${sttgs.outfit.artist.name}**`) : null,
            '',
            `\`[${sttgs.character.uid}]\` créer par <@${sttgs.character.rules.owner}>`,
            '',
            `${sttgs.smashed.length} Smash / ${sttgs.passed.length} Pass • ${this.element.member.displayName}`
          ].flat().filter(isString),
          ...GALLERIES,
          [
            {
              emoji: { name: "🥵" },
              label: "\u200b\u2000 SMASH \u2000\u200b",
              style: ButtonStyle.Danger,
              disabled: !sttgs.character.rules.can_be_smash,
              action: function() {
                sttgs.smashed.push(sttgs.character);
                return true;
              }
            },
            {
              emoji: { name: "🥶" },
              label: "\u200b\u2000 PASS \u2000\u200b",
              style: ButtonStyle.Primary,
              disabled: !sttgs.character.rules.can_be_pass,
              action: function() {
                sttgs.passed.push(sttgs.character);
                return true;
              }
            },
          ],
          [
            {
              emoji: { name: "🔒" },
              label: "Quitter la partie",
              action: function() {
                delete this.data._game._run;
                this.goto("game-setup");
                return true;
              }
            }
          ]
        ]
      }]
    },
  },
  {
    name: "game-end",
    beforeUpdate: function() {
      if (!this.data._game._end) {
        const { passed, smashed } = this.data._game._run;

        this.data._game._end = {
          NAVBAR: { page: 0, navspeed: 0 },
          smashed: { raw: smashed, pages: smashed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
          passed: { raw: passed, pages: passed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
        };
        
        // Je triche un peu pour avoir une navbar pour les deux avec une navbar virtuelle
        this.data._game._end.NAVBAR.pages = Array.from(Array(Math.max(smashed.length, passed.length)), (e,i) => i).chunkOf(25);
      }
    },
    components: function() {
      const sttgs = this.data._game._end;
      
      sttgs.smashed.raw.forEach(c => dbManager.SOP.character.smash(c.uid));
      sttgs.passed.raw.forEach(c => dbManager.SOP.character.pass(c.uid));

      let comment = null;
      if (sttgs.smashed.raw.length == 0) comment = "Tu es l'aigri originel";
      if (sttgs.passed.raw.length >= sttgs.smashed.raw.length * 2) comment = `Si tu devais être un cornichon, tu serais aigre doux 🥒`;
      if (sttgs.passed.raw.length >= sttgs.smashed.raw.length * 3) comment = `Tu es tellement aigre que même un citron aurait honte 🍋`;
      
      if (sttgs.smashed.raw.length == sttgs.passed.raw.length) comment = `L'équilibre parfait, le ying est le yang 👀`;
      
      if (sttgs.passed.raw.length == 0) comment = "Tu es l'horny originel";
      if (sttgs.smashed.raw.length >= sttgs.passed.raw.length * 2) comment = `Ton nom est à côté de la définition de "horny" dans le dictionnaire`;
      if (sttgs.smashed.raw.length >= sttgs.passed.raw.length * 3) comment = `Direction horny jail. ${Emotes.pshitpshit}`;

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# 🥵 SMASH OR PASS 🥶",
            "",
            "**Récapitulatif de tes smash / pass**",
            '',
            "## SMASH 🔥 🥵",
            sttgs.smashed.raw.length > 0 ? ValidateArray(sttgs.smashed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.smashed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.name}`), 2) : '```Tu es trop aigri•e pour avoir smash qui que ce soit```',
            '',
            "## PASS ❄ 🥶",
            sttgs.passed.raw.length > 0 ? ValidateArray(sttgs.passed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.passed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.name}`), 2) : '```Tu es trop horny pour avoir pass qui que ce soit```',
            '',
            comment,
            '',
            `${sttgs.smashed.raw.length} Smash / ${sttgs.passed.raw.length} Pass`,
            sttgs.NAVBAR.pages.length > 1 && `-# Vitesse de navigation : ±${[1,5,10][sttgs.NAVBAR.navspeed]} | Page ${sttgs.NAVBAR.page+1}/${Math.max(1,sttgs.NAVBAR.pages.length)}`,
          ].filter(isString),
          sttgs.NAVBAR.pages.length > 1 && GetNavBar(sttgs.NAVBAR),
          [
            {
              emoji: { name: "🏠" },
              label: "Menu principal",
              action: function() {
                delete this.data._game;
                this.goto('home');
                return true
              }
            },
            {
              emoji: { name: "🔁" },
              label: "Recommencer",
              action: function() {
                delete this.data._game._run;
                delete this.data._game._end;
                this.goto('game-setup');
                return true
              }
            },
            {
              emoji: { name: "🔒" },
              label: "Terminer",
              action: function() {
                this.goto("game-final");
                return true;
              }
            },
            {
              emoji: { name: "🔒" },
              label: "Fermer",
              style: ButtonStyle.Danger,
              action: function() {
                delete this.data._game._run;
                this.goto("game-setup");
                return true;
              }
            },
          ],
        ]
      }]
    }
  },
  {
    name: "game-final",
    beforeUpdate: function() {
      const sttgs = this.data._game._end;
      
      const safeName = this.element.member.displayName.replace(/[^\w\s]/gi, '');
      const filename = `Recap_${safeName}_${this.uid}.txt`;

      sttgs.filename = filename;
    },
    files: function() {
      const sttgs = this.data._game._end;

      const content = [
        `Player: ${this.element.member.displayName}`,
        '',
        'SMASH :',
        sttgs.smashed.raw.length == 0 ? "Trop aigri•e pour smash qui que ce soit..." : sttgs.smashed.raw.map((e,i) => `${i+1}. ${e.name}`),
        "",
        'PASS :',
        sttgs.passed.raw.length == 0 ? "Trop horny pour smash qui que ce soit..." : sttgs.passed.raw.map((e,i) => `${i+1}. ${e.name}`),
      ].flat().join("\n");

      return [
        new AttachmentBuilder(Buffer.from(content), { name: sttgs.filename }),
      ];
    },
    components: function() {
      const sttgs = this.data._game._end;

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# 🥵 SMASH OR PASS 🥶",
            "",
            `**Récapitulatif des smash et pass de ${this.element.member.displayName}**`,
          ],
          {
            type: ComponentType.File,
            file: {
              url: `attachment://${sttgs.filename}`,
              spoiler: true,
            }
          },
          [
            {
              label: "Supprimer le message",
              customId: `DELETE:GUILD_MOD:${this.element.member.id}`,
            }
          ]
        ]
      }];
    },
    afterUpdate: function() {
      this.deleteOnClose = false;
      this.collector.stop('stop');
    }
  }
];