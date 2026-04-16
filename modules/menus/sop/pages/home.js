import { ButtonStyle, ComponentType, SeparatorSpacingSize } from "discord.js"
import { Locales } from "#modules/Locales"

export default [
  {
    name: "home",
    components: function() {
      return [
        {
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            {
              type: ComponentType.TextDisplay,
              content: [
                "# 🥵  𝗦 𝗠 𝗔 𝗦 𝗛  𝗢 𝗥  𝗣 𝗔 𝗦 𝗦  🥶",
                "Dans ce jeu interactif hilarant, il ne s'agit pas de combat, mais de décisions!",
                `Affrontez un défilé de personnages hauts en couleur, chacun avec ses traits distinctifs, et répondez à la question fatidique : Smash or Pass ?.`,
                "## Personnages",
                `Il existe ${this.data.characters.length} personnages !`
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
                disabled: true,
                style: ButtonStyle.Primary,
                action: "goto:museum-select"
              },
              {
                emoji: "🥇",
                label: "Tops",
                disabled: true,
                style: ButtonStyle.Primary,
                action: "goto:tops"
              },
            ],
            [
              { emoji: "⚙️", label: "Paramètres", action: "goto:settings", style: ButtonStyle.Secondary },
              { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
              {
                emoji: "🐸",
                label: "CRASH",
                style: ButtonStyle.Danger,
                action: async function() {
                  throw new Error("This is an error lol.");
                }
              },
            ]
          ]
        }
      ]
    }
  },
];