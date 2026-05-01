import { MessageFlags, ComponentType, ButtonStyle, AttachmentBuilder } from "discord.js";

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

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