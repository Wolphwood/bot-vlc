import { ApplicationCommandType, ApplicationCommandOptionType } from 'discord.js';
import Locale from '#modules/Locales';
import { PERMISSION } from '#constants';

export default {
  name: "status",
  category: 'root',
  discord: {
    type: ApplicationCommandType.ChatInput,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: "status",
        description: Locale.get(`commandinfo.status.option.status.description`),
        required: true,
        choices: ['online', 'idle', 'dnd'].map(value => ({
          name: Locale.get(`generic.status.${value}`),
          value: value
        })),
      }
    ],
  },
  userPermission: PERMISSION.ROOT,

  /**
   * Exécution de la commande
   */
  run: async ({ client, interaction, args }) => {
    // Dans ton nouveau système, on assume que interaction est toujours là pour ChatInput
    const status = args.find(arg => arg.name === 'status')?.value || 'online';

    // Mise à jour du statut
    client.user.setStatus(status);

    const statusName = Locale.get(`generic.status.${status}`);
    
    return interaction.reply({ 
      content: Locale.get(`command.status.success`, statusName), 
      ephemeral: true 
    });
  },
};