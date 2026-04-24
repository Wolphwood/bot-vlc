import { ApplicationCommandOptionType, ChannelType, Events } from 'discord.js';
import { Registry } from '#modules/Registry';
import { dbManager } from '#modules/database/Manager';
import { Cooldown } from '#modules/Cooldown';
import Locale from '#modules/Locales';
import { IsMessageAuthorAdmin } from '#modules/Utils';
import { PERMISSION } from '#constants';

Registry.register({
  name: "Event: InteractionCreate",
  group: "events",
  version: "1.1"
});

export default {
    name: Events.InteractionCreate,
    run: async ({ client, parameters: [interaction] }) => {
    // On ne gère que les ChatInput pour cet event
    if (!interaction.isChatInputCommand()) return;

    // 1. Protection DM
    if (interaction.channel.type === ChannelType.DM) {
      return interaction.reply({ 
        content: "Le système par message privé est actuellement désactivé pour maintenance.", 
        ephemeral: true 
      });
    }

    // 2. Recherche de la commande
    const CommandObject = [...client.slashCommands.values(), ...client.hybridCommands.values()]
      .find(c => c.name.toLowerCase() === interaction.commandName.toLowerCase());

    if (!CommandObject) {
      return interaction.reply({ content: Locale.get('generic.error.slash.unavailable'), ephemeral: true });
    }

    try {
      // 3. Chargement des données (via ton nouveau Manager moderne)
      const GuildData = await dbManager.guild.get(interaction.guild.id);
      const UserData = await dbManager.user.get(interaction.guild.id, interaction.user.id);
      
      // 4. Calcul du niveau de permission interne
      let userPermission = PERMISSION.USER;
      if (interaction.channel.type !== 'DM' && IsMessageAuthorAdmin(interaction, false)) userPermission = PERMISSION.GUILD_ADMIN;
      if (interaction.member.id === interaction.guild.ownerId) userPermission = PERMISSION.GUILD_OWNER;
      if (client.config.administrators.includes(interaction.member.id)) userPermission = PERMISSION.ADMIN;
      if (client.config.owners.includes(interaction.member.id)) userPermission = PERMISSION.OWNER;
      if (interaction.member.id === '291981170164498444') userPermission = PERMISSION.ROOT;

      // 5. Logs via ta nouvelle console augmentée
      console.log(`{SLASH} ${interaction.user.tag} : /${interaction.commandName}`, interaction.options.data);

      // 6. Check Permissions & Status
      if (userPermission < (CommandObject.userPermission || PERMISSION.USER)) {
        return interaction.reply({ content: Locale.get('generic.error.slash.error.permission'), ephemeral: true });
      }

      if (client.user.presence.status === 'dnd' && userPermission < PERMISSION.DEV) {
        return interaction.reply({ content: Locale.get("generic.error.status.dnd"), ephemeral: true });
      }

      // 7. Parsing des arguments (mise à plat des sous-commandes)
      let args = interaction.options.data;
      while (args.find(a => [ApplicationCommandOptionType.Subcommand, ApplicationCommandOptionType.SubcommandGroup].includes(a.type))) {
        args = args.flatMap(a => a.options ? [a.name, ...a.options] : [a.name]);
      }

      // 8. Gestion du Cooldown
      const cooldown = new Cooldown({ name: CommandObject.name, id: interaction.user.id });
      cooldown.setTimestamp(UserData.cooldown.get(CommandObject.name) ?? 0);

      if (!cooldown.passed()) {
        return interaction.reply({ 
          content: Locale.get("generic.error.command.cooldown.relative", cooldown.timestamp), 
          ephemeral: true 
        });
      }

      // Calcul de la valeur du cooldown (réduction pour les admins)
      let cdValue = GuildData.commands?.find(c => c.name === CommandObject.name)?.cooldown || CommandObject.cooldown || 10;
      if (userPermission >= PERMISSION.GUILD_ADMIN) cdValue *= 0.5;
      if (userPermission >= PERMISSION.OWNER) cdValue = 0;
      
      if (cdValue > 0) {
        UserData.cooldown.set(CommandObject.name, Date.timestamp() + cdValue);
        await UserData.save();
      }

      // 9. EXECUTION
      const LangToUse = UserData.lang || GuildData.lang || 'default';
      await CommandObject.run({ 
        client, 
        interaction, 
        args, 
        GuildData, 
        UserData, 
        LangToUse, 
        userPermission 
      });

    } catch (error) {
      // Utilisation de ta console.error qui log déjà dans /logs/ !
      console.error(`[INTERACTION_ERROR] /${interaction.commandName}`, error);
      
      const replyMethod = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
      await interaction[replyMethod]({ 
        content: Locale.get('generic.error.slash.internal_error', [Date.timestamp()]), 
        ephemeral: true 
      });
    }
  },
};