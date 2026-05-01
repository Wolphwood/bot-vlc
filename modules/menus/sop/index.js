import { ComponentType, ButtonStyle, AttachmentBuilder } from "discord.js";

import { noop, DiscordMenu, isDefined, isNull, isString, ValidateArray, uncachedImport } from "#modules/Utils";
import Emotes from "#modules/Emotes"
import { dbManager } from "#modules/database/Manager"

const PageHome = await uncachedImport("./pages/home.js").then(m => m.default);
const PageSettings = await uncachedImport("./pages/settings.js").then(m => m.default);
const PageTops = await uncachedImport("./pages/tops.js").then(m => m.default);
const PagePlay = await uncachedImport("./pages/play.js").then(m => m.default);
const PageMuseum = await uncachedImport("./pages/museum.js").then(m => m.default);

import { SOP_PERMISSION } from "#constants";
import { gunzipSync } from "zlib";

import { SortByName } from "./shared.js";

export async function GameSmashOrPass({ client, discordElement, GuildData, UserData, userPermission }) {  
  let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
  let countall = await dbManager.SOP.character.count();
  let AllGroups = await dbManager.SOP.group.getWithAuth(null, discordElement.member, userPermission);
  loadingEmoteMessage.delete().catch(noop);

  const MenuGameSmashOrPass = new DiscordMenu({
  element: discordElement,
  ephemeral: true, v2: true,
  sendOptions: { allowedMentions: { users: [] } },
  collectorOptions: {
    idle: 600_000 // 10 minutes
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
    displayOptions: {
      phone: false,
      numberOfColumn: 2,
    },
    guild: GuildData,
    user: UserData,
    userPermission: userPermission ?? 0,
    totalCharactersCount: countall ?? 0,
    characters: [],
    groups: AllGroups.filter(g => g.can(SOP_PERMISSION.READ)).sort(SortByName),
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
    ...PageMuseum,
  ]
  });
  
  await MenuGameSmashOrPass.send();
  await MenuGameSmashOrPass.handle({ client });
}

export async function GameSmashOrPassFinalViewer({ client, interaction }) {
  let sopdata = null;
  try {
    sopdata = await FetchSOPData(interaction.message);
  } catch (err) {
    return interaction.reply("**Erreur de décompression :** " + err.message); 
  }

  const MenuGameSmashOrPass = new DiscordMenu({
  element: interaction,
  ephemeral: true, v2: true,
  collectorOptions: {
    idle: 60_000 // 1 minutes
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
    displayOptions: {
      phone: false,
      numberOfColumn: 2,
    },
    sop: sopdata,
  },
  pages: [
    {
      name: "main",
      beforeUpdate: function() {
        const sttgs = this.data.sop;

        if (!this.data._main) {
          const { super_passed, super_smashed, passed, smashed } = sttgs;

          this.data._main = {
            raw: this.data.sop,
            NAVBAR: { page: 0, navspeed: 0 },
            smashed: { pages: smashed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
            passed: { pages: passed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
            super_smashed: { pages: super_smashed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
            super_passed: { pages: super_passed.filter(e => isDefined(e) && !isNull(e)).chunkOf(25) },
          };
          
          this.data._main.NAVBAR.pages = Array.from(Array(Math.max(smashed.length, passed.length, super_smashed.length, super_passed.length))).chunkOf(25);
        }
      },
      components: async function() {
        const sttgs = this.data._main;
        const displayOptions = this.data.displayOptions;

        return [{
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            [
              "# 🥵 SMASH OR PASS 🥶",
              "",
              `**Récapitulatif des smash et pass de ${sttgs.raw.player}**`,
              '',
              "## SMASH 🔥 🥵",
              sttgs.raw.smashed.length > 0 ? ValidateArray(sttgs.smashed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.smashed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn) : '```Tu es trop aigri·e pour avoir smash qui que ce soit```',
              '',
              "## PASS ❄ 🥶",
              sttgs.raw.passed.length > 0 ? ValidateArray(sttgs.passed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.passed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn) : '```Tu es trop horny pour avoir pass qui que ce soit```',
              '',
              sttgs.raw.super_smashed.length > 0 && [
                "## ✨ SUPER SMASH 🔥 🥵",
                ValidateArray(sttgs.super_smashed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.super_smashed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn),
                '',
              ],
              sttgs.raw.super_passed.length > 0 && [
                "## ✨ SUPER PASS 🔥 🥵",
                ValidateArray(sttgs.super_passed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.super_passed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn),
                '',
              ],
              sttgs.raw.comment,
              '',
              sttgs.raw.user_comment && [
                `Commentaire de ${sttgs.raw.player} :`,
                sttgs.raw.user_comment,
                '',
              ],
              `${sttgs.raw.smashed.length + sttgs.raw.super_smashed.length} Smash / ${sttgs.raw.passed.length + sttgs.raw.super_passed.length} Pass`,
              sttgs.NAVBAR.pages.length > 1 && `-# Vitesse de navigation : ±${[1,5,10][sttgs.NAVBAR.navspeed]} | Page ${sttgs.NAVBAR.page+1}/${Math.max(1,sttgs.NAVBAR.pages.length)}`,
            ].flat().filter(isString),
            sttgs.NAVBAR.pages.length > 1 && GetNavBar(sttgs.NAVBAR),
            [
              {
                label: "Voir les personnages",
                action: "goto:view"
              },
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
        }];
      }
    },
    {
      name: "view",
      beforeUpdate: async function() {
        if (!this.data._view) {
          const SOP = this.data.sop;

          const any = [
            ...SOP.super_smashed.map(e => ({ ...e, smashed: true, super: true })),
            ...SOP.smashed.map(e => ({ ...e, smashed: true, super: false })),
            ...SOP.super_passed.map(e => ({ ...e, smashed: false, super: true })),
            ...SOP.passed.map(e => ({ ...e, smashed: false, super: false }))
          ].sort(SortByName);

          this.data._view = {
            mode: 'any',
            mapped: {},
            any: {
              list: any,
              page: 0, navspeed: 0, uid: 0,
            },
            smashed: {
              list: any.filter(e => e.smashed),
              page: 0, navspeed: 0, uid: 0,
            },
            passed: {
              list: any.filter(e => !e.smashed),
              page: 0, navspeed: 0, uid: 0,
            }
          };

          for (let mode of ['any', 'smashed', 'passed']) {
            this.data._view[mode].pages = this.data._view[mode].list.chunkOf(25);
          }
          
          any.forEach(data => this.data._view.mapped[data.character.uid] = data);
        }

        const sttgs = this.data._view;
        
        const navbar = sttgs[sttgs.mode];
        if (!navbar.uid) sttgs[sttgs.mode].uid = navbar.list[0].character.uid;
        const displaydata = sttgs.mapped[navbar.uid];

        sttgs.attachments = await Promise.all([
          GetCachedOutfitAttachment(displaydata.outfit)
        ]);
      },
      files: function() {
        const sttgs = this.data._view;
        return sttgs.attachments;
      },
      components: async function() {
        const sttgs = this.data._view;
        
        const navbar = sttgs[sttgs.mode];
        const displaydata = sttgs.mapped[navbar.uid];

        return [{
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            [
              displaydata.smashed
                ? (displaydata.super ? "# GOT SUPER SMASHED" : "# GOT SMASHED")
                : (displaydata.super ? "# GOT SUPER PASSED" : "# GOT PASSED")
              ,
              "",
              `## ${displaydata.character.name}`,
              `### Tenue: ${displaydata.outfit ? displaydata.outfit.name : 'Aucun visuel disponible'}`,
              displaydata.arc && `### Arc: ${displaydata.arc.name}`,
              displaydata.outfit?.artist?.name && "Visuel créer par " + (displaydata.outfit.artist.link ? `[${displaydata.outfit.artist.name}](${displaydata.outfit.artist.link})` : displaydata.outfit.artist.name),
            ].flat().filter(isString),
            {
              type: ComponentType.MediaGallery,
              items: sttgs.attachments?.map(attachment => ({ media: { url: `attachment://${attachment.name}` } }))
            },
            `Character: \`[${navbar.uid}]\` | Outfit: \`[${displaydata.outfit?.uid || 'None'}]\``,
            '.---',
            [{
              type: ComponentType.StringSelect,
              disabled: ValidateArray(navbar.pages[navbar.page], []).length === 0,
              options: ValidateArray(navbar.pages[navbar.page], []).length > 0
                ? navbar.pages[navbar.page].map((e,i) => ({ label: `${(i+1)+(navbar.page*25)}. ${e.super ? e.smashed ? '⭐ ' : '💀 ' : ''}${e.character.name}, Tenue: ${ e.outfit ? e.outfit.name : 'Inconnue' }`.limit(100), value: e.character.uid, default: e.character.uid === navbar.uid }))
                : [{ label: "Aucun personnage à afficher", value: "none", default: true }]
              ,
              action: async function({ interaction }) {
                navbar.uid = interaction.values[0];
                return true;
              },
            }],
            navbar.pages.length > 1 && GetNavBar(navbar),

            ['any', 'smashed', 'passed'].map(mode => ({
              label: mode.toUpperCase(),
              style: sttgs.mode == mode ? ButtonStyle.Primary : ButtonStyle.Secondary,
              disabled: ValidateArray(sttgs[mode]?.list, []).length === 0,
              action: function() {
                if (sttgs.mode == mode) return false;
                sttgs.mode = mode;
                return true
              },
            })),
            [
              {
                emoji: { name: '👈' },
                label: "\u200b",
                action: "goto:main"
              },
            ]
          ]
        }];
      }
    },
  ],
  });
  
  await MenuGameSmashOrPass.send();
  await MenuGameSmashOrPass.handle({ client });
}

export async function FetchSOPData(message) {
  try {
    // 1. Trouver l'attachement qui correspond à notre fichier binaire
    const binFile = message.components[0].components[2].file.data.url;

    if (!binFile) {
      console.error("Fichier data.bin introuvable dans le message.");
      return null;
    }

    // 2. Télécharger le contenu (Buffer)
    const response = await fetch(binFile);
    if (!response.ok) throw new Error(`Erreur HTTP: ${response.status}`);
    
    const buffer = Buffer.from(await response.arrayBuffer());

    // 3. Décompresser (Gzip) et parser le JSON
    const decompressed = gunzipSync(buffer);
    const data = JSON.parse(decompressed.toString());

    return data;
  } catch (error) {
    console.error("Erreur lors de la récupération des données SOP:", error.message);
    return null;
  }
}
