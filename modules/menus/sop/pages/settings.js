import { SOP_PERMISSION } from "#constants";
import { ButtonStyle, ComponentType } from "discord.js";

import PageGroup from "./settings/group.js"
import PageCharacter from "./settings/character.js"

export default [
  {
    name: "settings",
    beforeUpdate: function() {
      if (!this.data._settings) this.data._settings = { index: 0, page: 0 };
    },
    components: function() {
      let canManageAnyGroup = this.data.groups.some(g => g.can(SOP_PERMISSION.MANAGE_GRP));

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          "# Configuration du Smash or Pass",
          ".===",
          {
            type: ComponentType.Section,
            components: [
              "## Gérer les collections",
              "Permet de créer et gérer les différents groupes",
            ],
            accessory: {
              emoji: "👥",
              label: "Gérer",
              action: "goto:settings-group",
              style: ButtonStyle.Primary,
              disabled: !canManageAnyGroup
            }
          },
          ".===",
          {
            type: ComponentType.Section,
            components: [
              "## Gérer les personnages",
              "Permet de créer et gérer des personnages",
            ],
            accessory: {
              emoji: "👥",
              label: "Gérer",
              action: "goto:settings-character",
              style: ButtonStyle.Primary,
              // disabled: !canManageAnyGroup
            }
          },
          ".---",
          [
            { emoji: '🏠', label: "Accueil", action: "goto:home", style: ButtonStyle.Secondary },
            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
          ]
        ]
      }];
    }
  },
  ...PageGroup,
  ...PageCharacter,
];