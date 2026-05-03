import { ComponentType, ButtonStyle } from "discord.js"
import { dbManager } from "#modules/database/Manager";
import { SOP_PERMISSION } from "#constants";
import { isString, uncachedImport, ValidateArray } from "#modules/Utils";

const { GetNavBar, NumerotedListToColumns } = await uncachedImport("../shared.js");

// Fonction utilitaire de calcul identique au musée
function CalcScore({ smashed = 0, passed = 0, super_smashed = 0, super_passed = 0 } = {}) {
  const totalSmash = smashed + (super_smashed * 2);
  const totalPass = passed + (super_passed * 2);
  const totalVolume = totalSmash + totalPass;

  if (totalVolume === 0) return { ratio: 0, score: 0 };
  
  return {
    ratio: Math.round(((totalSmash - totalPass) / totalVolume) * 100) / 100,
    score: totalSmash - totalPass
  };
}

export default [
  {
    name: "tops-select",
    beforeUpdate: function() {
      if (!this.data._tops) {
        const readable = this.data.groups.filter(g => g.can(SOP_PERMISSION.READ));

        this.data._tops = { 
          readable, 
          page: 0, 
          pages: readable.chunkOf(25), 
          navspeed: 0 
        };
      }
      
      this.data._tops.slug = null;
    },
    components: function() {
      const sttgs = this.data._tops;
      const displayOptions = this.data.displayOptions;

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# 🏆 Classements (Tops & Flops)",
            "Sélectionnez une collection pour voir le podium de popularité.",
            "## Collections disponibles",
            sttgs.readable.length > 0 
              ? NumerotedListToColumns(sttgs.pages[sttgs.page]?.map((e,i) => `${(i+1)+(sttgs.page*25)}. ${e.name}`), displayOptions.numberOfColumn)
              : "Aucune collection disponible."
          ].flat(Infinity).filter(isString),
          ".---",
          [{
            type: ComponentType.StringSelect,
            placeholder: "Choisir une collection",
            disabled: ValidateArray(sttgs.pages[sttgs.page], []).length < 1,
            options: sttgs.pages[sttgs.page]?.map((e,i) => ({ 
              label: `${(i+1)+(sttgs.page*25)}. ${e.name}`, 
              value: e.slug 
            })) || [{ label: "Aucune option selectionnable", value: "none", default: true }],
            action: async function({ interaction }) {
              sttgs.slug = interaction.values[0];
              sttgs.groupName = sttgs.readable.find(g => g.slug === sttgs.slug)?.name;

              // On stocke les résultats pour la page suivante
              this.data._tops_results = {
                groupName: sttgs.groupName,
                best: await dbManager.SOP.character.getSorted({ limit: 3, sort: 'ratio', filter: { group_slug: sttgs.slug } }),
                worst: await dbManager.SOP.character.getSorted({ limit: 3, sort: 'anti_ratio', filter: { group_slug: sttgs.slug } }),
              };

              this.goto("tops-view");
              return true;
            },
          }],
          sttgs.pages.length > 1 ? [GetNavBar(sttgs)] : null,
          [
            { emoji: '🏠', label: "Home", action: function() { delete this.data._tops; this.goto('home'); return true; }},
            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
          ]
        ]
      }];
    }
  },
  {
    name: "tops-view",
    components: function() {
      const res = this.data._tops_results;

      return [
        {
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            `# 🏆 Podium : ${res.groupName}`
          ]
        },
        {
          type: ComponentType.Container,
          accent_color: this.data.color.green,
          components: [
            [
              "## 🔥 TOP 3 - Les chouchous",
              '',
              res.best.length > 0 
                ? res.best.flatMap((c, i) => [`${['🥇', '🥈', '🥉'][i]} **${c.name}** — Ratio: \`${c.ratio.round(2)}\``, ''])
                : "*Aucune donnée*",
            ].flat()
          ]
        },
        {
          type: ComponentType.Container,
          accent_color: this.data.color.red,
          components: [
            [
              "## ❄️ FLOP 3 - Les mal-aimés",
              '',
              res.best.length > 0 
                ? res.worst.flatMap((c, i) => [`${['💀', '🤡', '📉'][i]} **${c.name}** — Ratio: \`${c.ratio.round(2)}\``, ''])
                : "*Aucune donnée*",
            ].flat()
          ]
        },
        [
          {
            emoji: '👈',
            label: "Changer de collection",
            action: function() {
              delete this.data._tops_results;
              this.goto("tops-select");
              return true;
            }
          },
          {
            emoji: '🏠',
            label: "Menu principal",
            action: function() {
              delete this.data._tops;
              delete this.data._tops_results;
              this.goto('home');
              return true;
            }
          }
        ]
        
      ];
    }
  }
];