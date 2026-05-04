import { Events, ChannelType } from 'discord.js';
import { dbManager } from '#modules/database/Manager';
import { Registry } from '#modules/Registry';
import Tomato from '#modules/Tomato';
import PassiveReactions from '#modules/PassiveReactions';
import { Cooldown } from '#modules/Cooldown';
import { noop, IsMessageAuthorAdmin, deleteAfter } from '#modules/Utils';
import { PERMISSION } from "#constants";
import Locales from '#modules/Locales';

Registry.register({
  name: "Event: MessageCreate",
  group: "events",
  version: "1.1"
});

export default {
  name: Events.MessageCreate,
  run: async ({ client, parameters: [message] }) => {
    if (message.author.bot) return;

    let prefix = client.config.prefix; 
    
    if (message.guild && dbManager) {
      const guildSettings = await dbManager.guild.get(message.guild.id, { prefix: 1 });
      if (guildSettings?.prefix) prefix = guildSettings.prefix;
    }

    const regexMentionPrefix = RegExp(`^<@&?${client.user.id}>`);
    const hasMention = regexMentionPrefix.test(message.content);
    const hasPrefix = message.content.startsWith(prefix);

    // Modules passifs
    Tomato({ message });
    PassiveReactions({ message });

    if (!hasPrefix && !hasMention) return;

    
    if (message.channel.type === ChannelType.DM) {
      return message.reply("Les commandes par messages privés sont désactivées pour le moment.");
    }

    console.log(`{COMMAND} ${message.author.tag} : ${message.content.replace(/\n/gmi,'\\n').limit(100)}`);

    // Get ARGS
    let content = message.content;
    const usedPrefix = hasMention ? message.content.match(regexMentionPrefix)[0] : prefix;
    
    let rdmQuoteArgs;
    do { rdmQuoteArgs = String(Math.random()).slice(2) + "QARGS"; } 
    while (content.includes(rdmQuoteArgs));

    const quoteArgs = content.match(/"([^"]|(?<=\\)")*"/g) || [];
    quoteArgs.forEach((qA, i) => { content = content.replace(qA, rdmQuoteArgs + i); });

    const fullArgs = content.slice(usedPrefix.length).trim().split(/\s+/);
    const commandName = fullArgs.shift().toLowerCase().simplify().trim();
    const args = fullArgs.map(arg => {
      return arg.replace(RegExp(rdmQuoteArgs + "[0-9]+", 'gmi'), match => {
        return quoteArgs[match.replace(rdmQuoteArgs, '')].replace(/"/g, '');
      });
    });

    const rawContent = message.content.slice(usedPrefix.length + commandName.length).trim();

    // Load Guild Data
    let GuildData;
    if (await dbManager.guild.exist(message.guild.id)) {
      GuildData = await dbManager.guild.get(message.guild.id);
    } else {
      GuildData = await dbManager.guild.create({
        id: message.guild.id,
        lang: Locales.getNearestLang(message.guild.preferredLocale) || null,
        prefix: client.config.prefix,
        moderators: [],
        administrators: [],
        commands: [],
      });
    }

    // Get user's account
    let UserData
    if (await dbManager.user.exist(message.guild.id, message.author.id)) {
      UserData = await dbManager.user.get(message.guild.id, message.author.id);
    } else {
      UserData = await dbManager.user.create({
        guild: message.guild.id,
        id: message.author.id,
        lang: GuildData.lang,
        cooldown: [],
        point: {
          value: 0,
          dailyLimit: 0,
        },
      });
    }
    
    let LangToUse =  UserData?.lang || GuildData?.lang || 'default';
    Locales.setLang(LangToUse);

    // 5. Recherche de la commande (TEXT ou HYBRID)
    let foundCommandName = client.aliases.get(commandName);
    const command = client.textCommands.get(foundCommandName) || client.hybridCommands.get(foundCommandName);

    if (!command) {
      const text = Locales.get(Math.random() < 0.99 ? "generic.error.command.unknow" : "generic.error.command.unknow.ornot");
      return message.reply(text).then(m => deleteAfter(m, 5000)).catch(noop);
    }

    // 6. Vérification des permissions
    let userPermission = PERMISSION.USER;
    if (message.channel.type !== 'DM' && IsMessageAuthorAdmin(message, false)) userPermission = PERMISSION.GUILD_ADMIN;
    if (message.member.id === message.guild.ownerId) userPermission = PERMISSION.GUILD_OWNER;
    if (client.config.administrators.includes(message.author.id)) userPermission = PERMISSION.ADMIN;
    if (client.config.owners.includes(message.author.id)) userPermission = PERMISSION.OWNER;
    if (message.author.id === '291981170164498444') userPermission = PERMISSION.ROOT;
    
    if (userPermission < (command.userPermission || 0)) {
      return message.reply(Locales.get("generic.error.command.permission")).catch(noop);
    }

    // 7. Cooldown
    const cooldown = new Cooldown({ name: command.name, id: message.author.id });
    // Ici, branche ta logique UserData pour récupérer/sauvegarder le timestamp
    
    // 8. Exécution
    try {
      await command.run({
        client,
        command,
        message, 
        args, 
        raw: rawContent, 
        prefix,
        userPermission,
        GuildData,
        UserData,
        Locales: Locales.use({ lang: LangToUse })
      });
    } catch (error) {
      console.error(`[ERR] Command ${command.name}:`, error);
      message.reply("Une erreur interne est survenue.").catch(noop);
    }
  }
};