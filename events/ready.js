import { ApplicationCommandType, Events } from 'discord.js';
import { Registry } from '#modules/Registry';

Registry.register({
  name: "Event: ClientReady",
  group: "events",
  version: "2.0"
});

function formatOptions(options) {
  if (!options) return undefined;

  return options.map(opt => {
    const formattedOption = {
      ...opt,
      name: opt.name.toLowerCase().simplify().trim(),
    };

    if (opt.options) {
      formattedOption.options = formatOptions(opt.options);
    }

    return formattedOption;
  });
};

function formatCommand(cmd) {
  const cmdconfig = Array.isArray(cmd.discord) ? cmd.discord : [cmd.discord];

  return cmdconfig.map(conf => {
    const converted = {
      ...conf,
      name: cmd.name.toLowerCase().simplify().trim(),
      description: cmd.description,
      options: formatOptions(conf.options) 
    };

    // Les Context Menus (Message/User) ne doivent pas avoir de description
    if (converted.type === ApplicationCommandType.Message || converted.type === ApplicationCommandType.User) {
      delete converted.description;
    }

    return converted;
  });
};

export default {
  name: Events.ClientReady,
  once: true,
  run: async ({ client }) => {
    console.log(`Enregistrement des commandes pour ${client.user.tag}...`);

    try {
      const fullCommands = [
        ...client.slashCommands.values(),
        ...client.hybridCommands.values()
      ].flatMap(formatCommand);

      await client.application.commands.set(fullCommands);
      
      console.log(`[OK] ${fullCommands.length} commandes (Slash/Hybrid) synchronisées avec Discord !`);
    } catch (error) {
      console.error("[NOK] Erreur lors de l'enregistrement des commandes :", error);
    }

    let mEvents = [];
    let mUtils = [];
    let mDatabases = [];
    let mOther = [];
    Array.from(Registry.getValues()).forEach(entry => {
      if (entry.group == "events") {
        mEvents.push(entry);
      } else
      if (entry.group == "utils") {
        mUtils.push(entry);
      } else
      if (entry.group == "database") {
        mDatabases.push(entry);
      } else {
        mOther.push(entry);
      }
    });

    console.blank();
    console.llog(generateTree(
      `${mEvents.length} Events Chargés`,
      mEvents.map(module => ({ label: `${module.name}`, info: module.version ? `v${module.version}` : '', children: module.details?.map(label => ({ label })) }))
    ));
    console.blank();
    console.llog(generateTree(
      `${client.textCommands.size + client.hybridCommands.size + client.slashCommands.size} Commandes Chargées.`,
      [
        {
          label: `${client.textCommands.size} TEXT`,
          children: client.textCommands.values().map(command => ({ label: command.name, info: command.version ? `v${command.version}` : '' })).toArray()
        },
        {
          label: `${client.hybridCommands.size} HYBRID`,
          children: client.hybridCommands.values().map(command => ({ label: command.name, info: command.version ? `v${command.version}` : '' })).toArray()
        },
        {
          label: `${client.slashCommands.size} SLASH`,
          children: client.slashCommands.values().map(command => ({ label: command.name, info: command.version ? `v${command.version}` : '' })).toArray()
        },
      ]
    ));

    
    console.blank();
    console.llog(generateTree(
      `${mDatabases.length} Database Modules`,
      mDatabases.map(module => ({ label: `${ module.details?.length || 1 } ${module.name}`, info: module.version ? `v${module.version}` : '', children: module.details?.map(label => ({ label })) }))
    ));

    console.blank();
    console.llog(generateTree(
      `${mUtils.length} Utils Modules`,
      mUtils.map(module => ({ label: `${ module.details?.length || 1 } ${module.name}`, info: module.version ? `v${module.version}` : '', children: module.details?.map(label => ({ label })) }))
    ));

    if (mOther.length > 0) {
      console.blank();
      console.llog(generateTree(
        `${mOther.length} Other Modules`,
        mOther.map(module => ({ label: `${ module.details?.length || 1 } ${module.name}`, info: module.version ? `v${module.version}` : '', children: module.details?.map(label => ({ label })) }))
      ));
    }
  }
};


/**
 * Génère une structure en arbre sous forme de String
 * @param {string} title - Le titre de la section
 * @param {Array} data - Tableau d'objets { label, info, children }
 * @returns {string} - L'arbre formaté
 */
export function generateTree(title, data) {
  let output = ` # === ${title}\n`;

  const render = (items, prefix = "") => {

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const connector = isLast ? " `- " : " |- ";
      const childPrefix = isLast ? "  " : " | ";

      // Construction de la ligne
      const info = item.info ? ` ${item.info}` : "";
      output += `${prefix}${connector}${item.label}${info}\n`;

      if (item.children && item.children.length > 0) {
        render(item.children, prefix + childPrefix);
        if (!isLast) output += `${prefix} |  \n`;
      }
    });
  };

  render(data);
  return output;
}