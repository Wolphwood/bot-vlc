import { ButtonStyle } from "discord.js";

import Emotes from "#modules/Emotes"
import { ModalForm } from "#modules/Utils";

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