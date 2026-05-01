import { deleteAfter } from "#modules/Utils";

export default {
  name: "flop",
  aliases: ["wolph", "wolphwood"],
  category: "fun",
  run: async () => {
    discordElement.reply(`Flopwood c'est son nom.`).then(m => deleteAfter(m, 2000));
  },
};