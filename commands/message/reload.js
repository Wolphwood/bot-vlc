import { reload as ReloadCommands } from '../index.js'; // Ajuste le chemin selon ton dossier
import { PERMISSION } from '#constants';
import { deleteAfter } from '#modules/Utils';

export default {
  name: "reload",
  category: "root",
  permission: PERMISSION.ROOT,
  run: async ({ client, message }) => {
    
    // On prévient que le processus commence
    const msg = await message.reply({ content: "🔄 Rechargement des commandes...", fetchReply: true });

    try {
      const report = await ReloadCommands(client);
      let reportMsg = `✅ **${report.total} commandes rechargées.**`;

      if (report.added.length > 0) reportMsg += `\n🆕 Ajoutées : \`${report.added.join(', ')}\``;
      if (report.updated.length > 0) reportMsg += `\n📝 Modifiées : \`${report.updated.join(', ')}\``;
      if (report.removed.length > 0) reportMsg += `\n🗑️ Supprimées : \`${report.removed.join(', ')}\``;
      
      if (report.added.length === 0 && report.updated.length === 0 && report.removed.length === 0) {
        reportMsg += `\n✨ Aucun changement détecté.`;
      }
      
      return msg.edit(reportMsg).then(m => deleteAfter(m, 5000));
    } catch (error) {
      console.error(error);
      const errorContent = "❌ Erreur lors du rechargement des commandes.";
      return msg.edit(errorContent);
    }
  },
};