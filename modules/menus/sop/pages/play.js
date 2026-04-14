import { ComponentType, ButtonStyle } from "discord.js"
import { Locales } from "#modules/Locales"

import { GetNavBar } from "../index.js";
import { isNumber, ModalForm, selfnoop as sn } from "#modules/Utils";
import { dbManager } from "#modules/database/Manager";

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

      this.data._game.pages = this.data.groups.chunkOf(25);
      this.data._game.pagesLastIndex = this.data._game.pages.lastIndex;
    },
    components: function() {
      let sttgs = this.data._game;
      let sorts = {
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
            "## Personnages",
            `Il existe ${this.data.characters.length} personnages !`,
            "## Configuration de la partie",
            `Il existe ${this.data.characters.length} personnages !`,
            `-# Vitesse de navigation : ±${[1,5,10][sttgs.navspeed]} | Page ${sttgs.page+1}/${Math.max(1,sttgs.pages.length)}`,
          ],
          '.===',
          [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez la collection de personnages",
              min_values: 0, max_values: 1,
              options: sttgs.pages[sttgs.page].map((group, index) => ({
                label: `${(index + 1) + (25 * sttgs.page)}. ${group.name}`,
                value: group.slug,
                default: sttgs.slug == group.slug
              })),
              action: async function({ interaction }) {
                sttgs.slug = interaction.values[0];
                sttgs.availables = await dbManager.SOP.character.count({ slug: sttgs.slug });
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
                if (key.startsWith("count") && value > sttgs.availables) return null;

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

                console.inspect(chrs);

                // this.data._game = {
                //   characters: [...list],
                //   character: null,
                //   attachment: null,
                //   outfit: null,
                //   smashed: [],
                //   passed: [],
                // };

                // this.goto('game-run');

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
];