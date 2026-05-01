import { ButtonStyle, ComponentType } from "discord.js"

export default [
  {
    name: "home",
    components: function() {
      const displayOptions = this.data.displayOptions;

      return [
        {
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: [
                "# 🥵 SMASH OR PASS 🥶",
                "Dans ce jeu interactif hilarant, il ne s'agit pas de combat, mais de décisions!",
                `Affrontez un défilé de personnages hauts en couleur, chacun avec ses traits distinctifs, et répondez à la question fatidique : Smash or Pass ?.`,
                "## Personnages",
                `Il existe ${this.data.totalCharactersCount} personnages !`
              ]
            },
            '.=======',
            [
              {
                emoji: "▶",
                label: "Jouer",
                style: ButtonStyle.Primary,
                action: "goto:game-setup"
              },
              {
                emoji: "🏛️",
                label: "Museum",
                style: ButtonStyle.Primary,
                action: "goto:museum-select"
              },
              {
                emoji: "🥇",
                label: "Tops & Flops",
                style: ButtonStyle.Primary,
                action: "goto:tops-select"
              },
            ],
            [
              { emoji: "⚙️", label: "Gestion personnages", action: "goto:settings", style: ButtonStyle.Secondary },
              {
                label: "📱",
                style: displayOptions.phone ? ButtonStyle.Success : ButtonStyle.Secondary,
                action: function() {
                  displayOptions.phone = !displayOptions.phone;

                  if (displayOptions.phone) {
                    displayOptions.numberOfColumn = 1; 
                  } else {
                    displayOptions.numberOfColumn = 2; 
                  }

                  return true;
                },
              },
            ],
            [
              { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
            ]
          ]
        }
      ]
    }
  },
];