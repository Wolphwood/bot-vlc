import { ComponentType, ButtonStyle, AttachmentBuilder, MessageFlags } from "discord.js"
import { Locales } from "#modules/Locales"

import { gzipSync } from 'zlib';

import { Cooldown } from "#modules/Cooldown";
import { GetCachedOutfitAttachment, GetNavBar, NumerotedListToColumns, SortByName } from "../index.js";
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

      this.data._game.playable = this.data.groups.filter(g => g.can(SOP_PERMISSION.PLAY));
      this.data._game.pages = this.data._game.playable.chunkOf(25);

      sttgs.mapped_name = {};
      this.data._game.playable.forEach(g => sttgs.mapped_name[g.slug] = g.name);
    },
    components: function() {
      const sttgs = this.data._game;
      const displayOptions = this.data.displayOptions;
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
            "# 🥵 SMASH OR PASS 🥶",
            "Dans ce jeu interactif hilarant, il ne s'agit pas de combat, mais de décisions!",
            `Affrontez un défilé de personnages hauts en couleur, chacun avec ses traits distinctifs, et répondez à la question fatidique : Smash or Pass ?.`,
            
            !sttgs.slug ? [
              "## Groupes",
              this.data._game.playable.length > 0 ? [
                `Tu peux jouer avec ${this.data._game.playable.length} collections !`,
                NumerotedListToColumns(sttgs.pages[sttgs.page]?.map((e,i) => `${(i+1)+(sttgs.page*25)}. ${e.name}`) , displayOptions.numberOfColumn),
              ] : [
                `Il n'y a aucun groupe avec lequel tu peux jouer.`
              ]
            ] : [
              `## ${sttgs.mapped_name[sttgs.slug] || 'Unknown Group'}`,
              "## Personnages",
              `Il existe ${sttgs.characters.length} personnages dans cette collection.`,
            ],
            
            sttgs.slug && [
              "## Configuration de la partie",
              `- Nombre de personnages : ${sttgs.counts[sttgs.count] ?? '**AUCUNE OPTIONS SELECTIONNÉE**'}`,
              `- Tri des personnages : ${sorts[sttgs.sort] ?? '**AUCUNE OPTIONS SELECTIONNÉE**'}`,
            ],
            
            (!sttgs.slug && sttgs.pages.length > 1) && [
              "",
              `-# Vitesse de navigation : ±${[1,5,10][sttgs.navspeed]} | Page ${sttgs.page+1}/${Math.max(1,sttgs.pages.length)}`,
            ]
          ].flat(Infinity).filter(isString),
          '.---',
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
                  cooldown: null,
                  can_super_interact: false,
                  super: false,
                  smashed: [],
                  super_smashed: [],
                  passed: [],
                  super_passed: [],
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

      if (!sttgs.character) {
        sttgs.super = false;

        sttgs.outfit = null;
        sttgs.arc = null;
        sttgs.attachments = [];

        if (sttgs.characters.length === 0) {
          this.goto("game-end");
          return false;
        }

        sttgs.cooldown = {
          super_smash: new Cooldown({ name: `SOP:SUPER_SMASH`, id: this.data.user.id }),
          super_pass: new Cooldown({ name: `SOP:SUPER_PASS`, id: this.data.user.id }),
        };

        sttgs.cooldown.super_smash.setTimestamp(this.data.user.cooldown.get(sttgs.cooldown.super_smash.name) ?? 0);
        sttgs.cooldown.super_pass.setTimestamp(this.data.user.cooldown.get(sttgs.cooldown.super_pass.name) ?? 0);

        sttgs.can_super_smash = sttgs.cooldown.super_smash.passed();
        sttgs.can_super_pass = sttgs.cooldown.super_pass.passed();
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
      }
    },
    files: function() {
      const sttgs = this.data._game._run;
      return sttgs.attachments;
    },
    components: function() {
      const sttgs = this.data._game._run;
      const displayOptions = this.data.displayOptions;

      const GALLERIES = sttgs.attachments.length === 0 ? [] : sttgs.attachments.chunkOf(10).map(attachments => {
        return {
          type: ComponentType.MediaGallery,
          items: attachments.map(attachment => ({ media: { url: `attachment://${attachment.name}` } }))
        }
      });

      const SPLIT = (str) => displayOptions.phone ? str : str.split('').join('\u2000').replace(/\s/,'\u200b \u200b');
      const LARGE = (str) => displayOptions.phone ? str : `\u200b\u2000\u200b\u2000\u200b ${str} \u200b\u2000\u200b\u2000\u200b`;

      
      function GetCharacterObject() {
        const extract = (obj, ...keys) => {
          if (!obj) return null;
          const o = {};
          keys.forEach(key => o[key] = obj[key]);
          return o;
        }

        return {
          character: extract(sttgs.character, 'uid', 'group_slug', 'name'),
          outfit: extract(sttgs.outfit, 'id', 'name', 'filename', 'artist'),
          arc: extract(sttgs.arc, 'id', 'name'),
        }
      }

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# 🥵 SMASH OR PASS 🥶",
            `## ${ sttgs.character.name || 'John Doe' }`,
            sttgs.outfit ? (sttgs.arc ? `### ${sttgs.outfit.name} (${sttgs.arc.name})` : `## ${sttgs.outfit.name}`) : '## Pas visuel disponible.',
            sttgs.outfit?.artist?.name ? "Visuel créer par " + (sttgs.outfit.artist.link ? `**[${sttgs.outfit.artist.name}](${sttgs.outfit.artist.link})**` : `**${sttgs.outfit.artist.name}**`) : null,
            '',
            `\`[${sttgs.character.uid}]\` créer par <@${sttgs.character.rules.owner}>`,
            '',
            `${sttgs.smashed.length + sttgs.super_smashed.length} Smash / ${sttgs.passed.length + sttgs.super_passed.length} Pass • ${this.element.member.displayName}`
          ].flat().filter(isString),
          ...GALLERIES,
          [
            {
              emoji: displayOptions.phone ? undefined : { name: "🥵" },
              label: sttgs.super ? LARGE(SPLIT(displayOptions.phone ? "S.SMASH" : "SUPER SMASH")) : LARGE("SMASH"),
              style: ButtonStyle.Danger,
              disabled: sttgs.super ? !(sttgs.character.rules.can_be_super_smash && sttgs.can_super_smash) : !sttgs.character.rules.can_be_smash,
              action: async function() {
                if (sttgs.super) {
                  sttgs.cooldown.super_smash.set((22 * 3600) - (30 * 60)); // 23h30
                  this.data.user.cooldown.set(sttgs.cooldown.super_smash.name, sttgs.cooldown.super_smash.timestamp);
                  await this.data.user.save();

                  sttgs.super_smashed.push(GetCharacterObject());
                } else {
                  sttgs.smashed.push(GetCharacterObject());
                }

                sttgs.character = null;
                return true;
              }
            },
            {
              label: "🔥",
              style: sttgs.super ? ButtonStyle.Success : ButtonStyle.Secondary,
              disabled: !(sttgs.can_super_smash || sttgs.can_super_pass),
              action: function() {
                sttgs.super = !sttgs.super;
                return true;
              }
            },
            {
              emoji: displayOptions.phone ? undefined : { name: "🥶" },
              label: sttgs.super ? LARGE(SPLIT(displayOptions.phone ? "S.PASS" : "SUPER PASS")) : LARGE("PASS"),
              style: ButtonStyle.Primary,
              disabled: sttgs.super ? !(sttgs.character.rules.can_be_super_pass && sttgs.can_super_pass) : !sttgs.character.rules.can_be_pass,
              action: async function() {
                if (sttgs.super) {
                  sttgs.cooldown.super_pass.set((22 * 3600) - (30 * 60)); // 23h30
                  this.data.user.cooldown.set(sttgs.cooldown.super_pass.name, sttgs.cooldown.super_pass.timestamp);
                  await this.data.user.save();

                  sttgs.super_passed.push(GetCharacterObject());
                } else {
                  sttgs.passed.push(GetCharacterObject());
                }

                sttgs.character = null;
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
            },
          ]
        ]
      }]
    },
  },
  {
    name: "game-end",
    beforeUpdate: function() {
      if (!this.data._game._end) {
        const { super_passed, super_smashed, passed, smashed } = this.data._game._run;

        super_passed.sort(SortByName);
        super_smashed.sort(SortByName);
        passed.sort(SortByName);
        smashed.sort(SortByName);

        this.data._game._end = {
          NAVBAR: { page: 0, navspeed: 0 },
          smashed: { raw: smashed, pages: smashed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
          passed: { raw: passed, pages: passed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
          super_smashed: { raw: super_smashed, pages: super_smashed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
          super_passed: { raw: super_passed, pages: super_passed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
        };
        
        // Je triche un peu pour avoir une navbar pour les deux avec une navbar virtuelle
        this.data._game._end.NAVBAR.pages = Array.from(Array(Math.max(smashed.length, passed.length, super_smashed.length, super_passed.length)), (e,i) => i).chunkOf(25);
      }
    },
    components: async function() {
      const sttgs = this.data._game._end;
      const displayOptions = this.data.displayOptions;
      
      await sttgs.smashed.raw.map(async (c) => {
        await dbManager.SOP.character.smash(c.character.uid);
        await dbManager.SOP.character.smashOutfit(c.character.uid, c.outfit.id);
      }).promise();
      await sttgs.passed.raw.map(async (c) => {
        await dbManager.SOP.character.pass(c.character.uid);
        await dbManager.SOP.character.passOutfit(c.character.uid, c.outfit.id);
      }).promise();
      await sttgs.super_smashed.raw.map(async (c) => {
        await dbManager.SOP.character.superSmash(c.character.uid);
        await dbManager.SOP.character.superSmashOutfit(c.character.uid, c.outfit.id);
      }).promise();
      await sttgs.super_passed.raw.map(async (c) => {
        await dbManager.SOP.character.superPass(c.character.uid);
        await dbManager.SOP.character.superPassOutfit(c.character.uid, c.outfit.id);
      }).promise();

      const s = sttgs.smashed.raw.length;
      const ss = sttgs.super_smashed.raw.length;
      const p = sttgs.passed.raw.length;
      const sp = sttgs.super_passed.raw.length;

      const smashScore = s + (ss * 2);
      const passScore = p + (sp * 2);

      const variations = [
        { check: () => s === 0 && ss > 0, msg: `Tu n'as qu'une seule source d'amour, c'est ${sttgs.super_smashed.raw[0]?.character.name} et tu le fais savoir~💘` },
        { check: () => p === 0 && sp > 0, msg: `Tu détestes à ce point ${sttgs.super_passed.raw[0]?.character.name} ?` },

        { check: () => ss+sp > 0 && ss === sp, msg: `Tu aime autant ${sttgs.super_smashed.raw[0]?.character.name} que tu ne deteste ${sttgs.super_passed.raw[0]?.character.name}... c'est fascinant...` },
        
        { check: () => smashScore === passScore && smashScore > 0, msg: "L'équilibre parfait, le yin et le yang. 👀" },
        
        { check: () => (s + ss) === 0 && (p + sp) > 0, msg: "Tu es l'aigri originel." },
        { check: () => (p + sp) === 0 && (s + ss) > 0, msg: "Tu es l'horny originel." },

        { check: () => passScore >= smashScore * 5, msg: "Tu es une véritable tonneau à vinaigre. 🏭" },
        { check: () => passScore >= smashScore * 3, msg: `Tu es tellement aigre que même un citron aurait honte. 🍋` },
        { check: () => passScore >= smashScore * 2, msg: `Si tu devais être un cornichon, tu serais aigre-doux. 🥒 Difficile à satisfaire, mais pas impossible.` },
        
        { check: () => smashScore >= passScore * 5, msg: `${Emotes.pshitpshit.repeat(5)}` },
        { check: () => smashScore >= passScore * 3, msg: `Direction horny jail. ${Emotes.pshitpshit}` },
        { check: () => smashScore >= passScore * 2, msg: `Ton nom est à côté de la définition de "horny" dans le dictionnaire.` },
      ];

      sttgs.comment = variations.find(v => v.check())?.msg || "Tu es tellement basique que je n'ai rien à dire sur toi...";

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
            s > 0 ? ValidateArray(sttgs.smashed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.smashed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn) : '```Tu es trop aigri•e pour avoir smash qui que ce soit```',
            '',
            "## PASS ❄ 🥶",
            p > 0 ? ValidateArray(sttgs.passed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.passed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn) : '```Tu es trop horny pour avoir pass qui que ce soit```',
            '',
            ss > 0 && [
              "## ✨ SUPER SMASH 🔥 🥵",
              ValidateArray(sttgs.super_smashed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.super_smashed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn),
              '',
            ],
            sp > 0 && [
              "## ✨ SUPER PASS ❄ 🥶",
              ValidateArray(sttgs.super_passed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.super_passed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn),
              '',
            ],
            sttgs.comment,
            '',
            `${sttgs.smashed.raw.length + sttgs.super_smashed.raw.length} Smash / ${sttgs.passed.raw.length + sttgs.super_passed.raw.length} Pass`,
            sttgs.NAVBAR.pages.length > 1 && `-# Vitesse de navigation : ±${[1,5,10][sttgs.NAVBAR.navspeed]} | Page ${sttgs.NAVBAR.page+1}/${Math.max(1,sttgs.NAVBAR.pages.length)}`,
          ].flat().filter(isString),
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
              emoji: { name: "📨" },
              label: "Publier",
              disabled: sttgs.sent,
              action: async function() {
                const sttgs = this.data._game._end;
                sttgs.sent = true;
              
                const safeName = this.element.member.displayName.replace(/[^\w\s]/gi, '');
                const filename = `Recap_${safeName}_${this.uid}.txt`;

                const files = () => {
                  const { super_passed, super_smashed, passed, smashed } = this.data._game._run;
                  const { comment } = this.data._game._end;

                  const dataString = JSON.stringify({ player: this.element.member.displayName, super_passed, super_smashed, passed, smashed, comment });
                  const compressedData = gzipSync(dataString);

                  function getname({ character, outfit, arc } = {}) {
                    if (!character) return 'John Doe';
                    const output = [ character.name ];
                    if (outfit) output.push(`- ${outfit.name}`);
                    if (arc) output.push(`(${arc.name})`);
                    return output.join(' ');
                  }

                  const content = [
                    `Player: ${this.element.member.displayName}`,
                    '',
                    sttgs.super_smashed.raw.length > 0 && [
                      '✨🥵 SUPER SMASH :',
                      sttgs.super_smashed.raw.map((e,i) => `${i+1}. ${getname(e)} ✨`),
                      "",
                    ],
                    sttgs.super_passed.raw.length > 0 && [
                      '✨🥶 SUPER PASS :',
                      sttgs.super_passed.raw.map((e,i) => `${i+1}. ${getname(e)} ✨`),
                      '',
                    ],
                    '🥵 SMASH :',
                    sttgs.smashed.raw.length == 0 ? "Trop aigri•e pour smash qui que ce soit..." : sttgs.smashed.raw.map((e,i) => `${i+1}. ${getname(e)}`),
                    "",
                    '🥶 PASS :',
                    sttgs.passed.raw.length == 0 ? "Trop horny pour smash qui que ce soit..." : sttgs.passed.raw.map((e,i) => `${i+1}. ${getname(e)}`),
                    '',
                    sttgs.comment
                  ].flat(Infinity).filter(isString).join("\n");

                  return [
                    { attachment: Buffer.from(content), name: filename },
                    { attachment: compressedData, name: "data.bin" },
                  ];
                };
                
                const components = () => {
                  return this.processComponents([{
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
                          url: `attachment://${filename}`,
                          spoiler: true,
                        }
                      },
                      {
                        type: ComponentType.File,
                        file: {
                          url: `attachment://data.bin`,
                          spoiler: true,
                        }
                      },
                      [
                        {
                          label: "Voir le résultat",
                          style: ButtonStyle.Primary,
                          customId: `MENU-SOP-FINAL:USER`,
                        },
                        {
                          label: "Supprimer le message",
                          style: ButtonStyle.Danger,
                          customId: `DELETE:GUILD_MOD:${this.element.member.id}`,
                        }
                      ]
                    ]
                  }]);
                };

                this.element.channel.send({
                  flags: [ MessageFlags.IsComponentsV2 ],
                  files: await files(),
                  components: await components(),
                });

                return true;
              }
            },
            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
          ],
        ]
      }]
    }
  }
];