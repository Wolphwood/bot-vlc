import { MessageFlags, ComponentType, ButtonStyle, AttachmentBuilder } from "discord.js";

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

import { noop, DiscordMenu, ModalForm, isDefined, isNull, isString, ValidateArray } from "#modules/Utils";
import { Locales } from "#modules/Locales"
import Emotes from "#modules/Emotes"
import { dbManager } from "#modules/database/Manager"

// Trier les personnages par nom
export function SortByName(a,b) {
  const kA = (a.name ?? a.character?.name ?? '').simplify().toLowerCase();
  const kB = (b.name ?? b.character?.name ?? '').simplify().toLowerCase();
  return kA < kB ? -1 : kA > kB ? 1 : 0;
}
export function SortByReversedName(a,b) {
  const kA = (a.name ?? a.character?.name ?? '').simplify().toLowerCase();
  const kB = (b.name ?? b.character?.name ?? '').simplify().toLowerCase();
  return kA < kB ? 1 : kA > kB ? -1 : 0;
}

// Trier les personnages par Ratio
export function SortByRatio(a,b) {
  return a.ratio > b.ratio ? -1 : a.ratio < b.ratio ? 1 : 0;
}
export function SortByReversedRatio(a,b) {
  return a.ratio > b.ratio ? 1 : a.ratio < b.ratio ? -1 : 0;
}

export function GetMemoryDumpButton() {
  return {
    emoji: '👾',
    label: "MEMORY DUMP",
    style: ButtonStyle.Secondary,
    action: async function() {
      const folder = './logs/dumps/DiscordMenu';
      let filename = null;
      let counter = 0;
      
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
      
      do {
        filename = counter > 0 ? `menu_${this.uid}-${counter}.json` : `menu_${this.uid}.json`;
      } while (fs.existsSync(path.join(folder, filename)));
      
      fs.appendFileSync(path.join(folder, filename), JSON.stringify(this.data, null, 2));
      
      const logcontext = dbManager.log.getContextFromElement("DiscordMenu", this.element, this);
      const uid = await dbManager.log.save({ ...logcontext, folder, filename});
      
      this.element.channel.send({
        flags: [ MessageFlags.IsComponentsV2 ],
        components: [{
          type: ComponentType.Container,
          accent_color: this.data.color.values().getRandomElement(),
          components: [
            {
              type: ComponentType.TextDisplay,
              content: [
                "**Full MEMORY DUMP**",
                `Filename: \`${filename}\``,
              ].join('\n')
            },
            {
              type: ComponentType.ActionRow,
              components: [
                {
                  type: ComponentType.Button,
                  label: "Get Memory Dump (DATA)",
                  style: ButtonStyle.Secondary,
                  customId: `GETLOG:DEV:${uid}`
                },
                {
                  type: ComponentType.Button,
                  label: "Get Memory Dump (FILE)",
                  style: ButtonStyle.Secondary,
                  customId: `GETFILE:DEV:${uid}`
                }
              ]
            }
          ]
        }]
      });

      return true;
    }
  };
}

import PageHome from "./pages/home.js"
import PageSettings from "./pages/settings.js"
import PageTops from "./pages/tops.js"
import PagePlay from "./pages/play.js"
import PageMuseum from "./pages/museum.js"

import { SOP_PERMISSION } from "#constants";
import { gunzipSync } from "zlib";

export async function GameSmashOrPass({ client, discordElement, GuildData, UserData, userPermission }) {
  let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
  let countall = await dbManager.SOP.character.count();
  let AllGroups = await dbManager.SOP.group.getWithAuth(null, discordElement.member, userPermission);
  loadingEmoteMessage.delete().catch(noop);

  const MenuGameSmashOrPass = new DiscordMenu({
  element: discordElement,
  ephemeral: true, v2: true,
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
              sttgs.raw.smashed.length > 0 ? ValidateArray(sttgs.smashed.pages[sttgs.NAVBAR.page], []).length === 0 ? '```Rien sur cette page```' : NumerotedListToColumns(sttgs.smashed.pages[sttgs.NAVBAR.page].map((e,i) => `${(i+1)+(sttgs.NAVBAR.page*25)}. ${e.character.name}`), displayOptions.numberOfColumn) : '```Tu es trop aigri•e pour avoir smash qui que ce soit```',
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

export function GetNavBar(sttgs) {
  const SetPage = (value) => {
    const w = sttgs.page;
    sttgs.page = Math.clamp(value, 0, sttgs.pages.lastIndex);
    return sttgs.page !== w;
  }
  const PrevPage = () => {
    return SetPage(sttgs.page - [1,5,10][sttgs.navspeed]);
  }
  const NextPage = () => {
    return SetPage(sttgs.page + [1,5,10][sttgs.navspeed]);
  }

  const DecreaseNavSpeed = () => {
    sttgs.navspeed--;
    return true;
  }
  const IncreaseNavSpeed = () => {
    sttgs.navspeed++;
    return true;
  }

  let iconType = ['simple','double','triple'][sttgs.navspeed];

  return [
    { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left[iconType]), label: "\u200b", action: PrevPage, style: ButtonStyle.Secondary, disabled: sttgs.page < 1 },
    
    { emoji: "➖", label: "\u200b", action: DecreaseNavSpeed, style: ButtonStyle.Secondary, disabled: sttgs.navspeed <= 0 },
    
    { emoji: Emotes.GetEmojiObject(Emotes.compass.black), label: "\u200b", action: async ({interaction}) => {
      let modal = new ModalForm({ title: "Aller à une page", time: 120_000 })
        .addRow().addTextField({ name: 'number', label: "Numero de page", placeholder: `1-${sttgs.pages.length}` })
      ;
      
      let result = await modal.setInteraction(interaction).popup();
      if (!result || isNaN(result.get('number'))) return false;

      return SetPage(Number(result.get('number')) - 1);
    }, style: ButtonStyle.Secondary },
    
    { emoji: "➕", label: "\u200b", action: IncreaseNavSpeed, style: ButtonStyle.Secondary, disabled: sttgs.navspeed >= 2 },
    
    { emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right[iconType]), label: "\u200b", action: NextPage, style: ButtonStyle.Secondary, disabled: sttgs.page >= sttgs.pages.lastIndex},
  ]
}

const AttachmentCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes en millisecondes

/**
 * Récupère ou crée un Attachment avec auto-nettoyage
 */
export function GetCachedAttachment(cacheKey, filename, filepath) {
  if (!filename) return null;

  if (AttachmentCache.has(cacheKey)) {
    const cached = AttachmentCache.get(cacheKey);
    
    clearTimeout(cached.timeout);
    cached.timeout = setTimeout(() => AttachmentCache.delete(cacheKey), CACHE_TTL);
    
    return cached.attachment;
  }

  const attachment = new AttachmentBuilder(filepath, { 
    name: filename
  });

  const timeout = setTimeout(() => AttachmentCache.delete(cacheKey), CACHE_TTL);
  AttachmentCache.set(cacheKey, { attachment, timeout });

  return attachment;
}

export function GetCachedOutfitAttachment(outfit) {
  if (!outfit)
    return GetCachedAttachment('outfit_noimg', 'noimg.png', './assets/noimg.png');

  const cacheKey = `outfit_${outfit.filename}`;

  const filepath = `./assets/sop/outfits/${outfit.filename}`;

  if (!fs.existsSync(filepath)) 
    return GetCachedAttachment('outfit_brokenlink', 'brokenlink.png', './assets/brokenlink.png');
  
  return GetCachedAttachment(cacheKey, outfit.filename, filepath);
}

export async function GetCachedOutfitAttachmentPreview(outfit) {
  if (!outfit || !outfit.filename)
    return GetCachedAttachment('preview_noimg', 'preview_noimg.png', './assets/preview_noimg.png');

  const sourcePath = `./assets/sop/outfits/${outfit.filename}`;
  const previewFilename = `${outfit.filename.split('.')[0]}.png`;
  const previewPath = `./assets/sop/outfits/previews/${previewFilename}`;
  const cacheKey = `outfit_preview_${previewFilename}`;

  if (!fs.existsSync(sourcePath)) {
    return GetCachedAttachment('preview_brokenlink', 'preview_brokenlink.png', './assets/preview_brokenlink.png');
  }

  if (!fs.existsSync(previewPath)) {
    try {
      const dir = path.dirname(previewPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      await sharp(sourcePath)
        .resize(128, 128, { fit: 'cover' })
        .png()
        .toFile(previewPath);
    } catch (err) {
      console.error(`Erreur resize pour ${outfit.filename}:`, err);
      return GetCachedAttachment('preview_brokenlink', 'preview_brokenlink.png', './assets/preview_brokenlink.png');
    }
  }

  return GetCachedAttachment(cacheKey, previewFilename, previewPath);
}

export function NumerotedListToColumns(list, count) {
  if (!list) return "```\u200b```";
  if (list.length <= count) return "```\n"+ list.join(' | ') +"\n```";
  
  const segmenter = new Intl.Segmenter('fr', { granularity: 'grapheme' });
  
  const getVisualLength = (str) => {
    if (!str) return 0;
    return [...segmenter.segment(str)].length;
  };

  const size = Math.ceil(list.length / count);
  const columns = Array.from(Array(count), (e, i) => list.slice(size * i, size * (i + 1)));

  const widths = columns.map(col => 
    col.length > 0 ? Math.max(...col.map(s => getVisualLength(s))) + 1 : 0
  );

  const compensate = (str) => !str ? '' : /^[0-9]\./g.test(str) ? " " + str : str;

  const text = Array.from(Array(size), (e, i) => Array.from(Array(count), (ee, ii) => {
    const c = compensate(columns[ii][i]);
    const cLen = getVisualLength(c);
    return [ c + " ".repeat(Math.max(0, widths[ii] - cLen)), '│' ];
  }).flat().slice(0, -1).join(' ').trimEnd()).join('\n');

  return "```\n" + text + "\n```";
}