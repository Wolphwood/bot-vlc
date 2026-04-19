import { ButtonStyle } from "discord.js";

const formatPct = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });

export default [
  {
    name: "tops",
    // On utilise une fonction de préparation pour ne pas trier 100x
    beforeUpdate: function() {
      if (this.data._tops) return;

      const sorted = [...this.data.characters].sort((a, b) => {
        const ratioA = (a.stats.smashed - a.stats.passed) / (a.stats.smashed + a.stats.passed) || 0;
        const ratioB = (b.stats.smashed - b.stats.passed) / (b.stats.smashed + b.stats.passed) || 0;
        return ratioB - ratioA;
      });

      this.data._tops = {
        popular: sorted.slice(0, 3),
        unpopular: sorted.slice(-3).reverse()
      };
    },
    embeds: function() {
      const { popular, unpopular } = this.data._tops;

      const renderList = (chars) => chars.map((c, i) => {
        const total = c.stats.smashed + c.stats.passed;
        const ratio = (c.stats.smashed - c.stats.passed) / total || 0;
        const sPct = formatPct.format(c.stats.smashed / total || 0);
        
        return `${['🥇','🥈','🥉'][i] || '🏅'} **${c.name}**\n└ ${c.stats.smashed} Smash (${sPct}) • Ratio: ${ratio.toFixed(2)}`;
      }).join('\n\n');
      
      return [
        {
          title: "🏆 Top 3 - Les plus célèbres",
          description: renderList(popular),
          color: 0x5865F2,
        },
        {
          title: "💀 Top 3 - Les moins appréciés",
          description: renderList(unpopular),
          color: 0xEF5858,
        }
      ];
    },
    components: [[
      { emoji: '🏠', label: "Accueil", action: "goto:home", style: ButtonStyle.Secondary },
    ]]
  },
];