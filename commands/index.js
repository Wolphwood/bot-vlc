import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { PERMISSION, COMMAND_TYPE } from '#constants';
import Locales from '#modules/Locales';

async function LoadFile(client, ctype, fPath) {
  const d = {
    type: ctype,
    name: null,
    version: null,
    syntax: null,
    aliases: [],
    permission: PERMISSION.USER,
    cooldown: 10,
    dm: false,
    categories: [],
    file: fPath,
    tags: [],
    discord: {},
    secret: false,
  };

  const proc = (data) => {
    if (!data.categories) data.categories = [];
    data.categories.push(data.category || 'uncategorized');
    delete data.category;

    const merged = { ...d, ...data };

    if (!merged.description) merged.description = Locales.get(`commandinfo.${data.name.toLowerCase().simplify()}.description`);
    if (!merged.syntax) merged.syntax = Locales.get(`commandinfo.${data.name.toLowerCase().simplify()}.syntax`);

    // Normalisation : on traite merged.discord comme un array pour boucler dessus
    const discordEntries = Array.isArray(merged.discord) ? merged.discord : [merged.discord];

    discordEntries.forEach(entry => {
      if (entry?.options) {
        entry.options = entry.options.map(option => {
          return ["SUB_COMMAND", "SUB_COMMAND_GROUP"].includes(option.type)
            ? proc(option) // Récursion pour les sous-commandes
            : option;
        });
      }
    });
    
    return merged;
  };

  const fURL = `${pathToFileURL(fPath).href}?update=${Date.now()}`;
  const { default: data, load } = await import(fURL);

  if (typeof load === "function") {
    await load(client);
  }

  return proc(data); 
}

export async function reload(client) {
  // [ CONFIG ]
  const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
  client.config.version = pkg.version;

  // [ COMMANDS ]
  const before = new Map();
  
  // 1. On enregistre l'état actuel (nom + date de modif)
  const collections = [client.textCommands, client.slashCommands, client.hybridCommands];
  collections.forEach(col => {
    col.forEach((cmd, name) => {
      const stats = fs.statSync(cmd.file);
      before.set(name, stats.mtimeMs);
    });
  });

  // 2. On vide et on recharge
  client.textCommands.clear();
  client.slashCommands.clear();
  client.hybridCommands.clear();
  client.aliases.clear();
  
  await load(client);

  // 3. Comparaison
  const report = { added: [], removed: [], updated: [], total: 0 };
  const currentCommands = new Map();
  
  const newCollections = [client.textCommands, client.slashCommands, client.hybridCommands];
  newCollections.forEach(col => {
    col.forEach((cmd, name) => {
      report.total++;
      const stats = fs.statSync(cmd.file);
      currentCommands.set(name, stats.mtimeMs);

      if (!before.has(name)) {
        report.added.push(name);
      } else if (before.get(name) !== stats.mtimeMs) {
        report.updated.push(name);
      }
    });
  });

  // Détection des suppressions
  before.forEach((time, name) => {
    if (!currentCommands.has(name)) report.removed.push(name);
  });

  return report;
}

export async function load(client) {
  const folders = [
    { path: "./commands/message", type: COMMAND_TYPE.MESSAGE },
    { path: "./commands/hybrid",  type: COMMAND_TYPE.HYBRID  },
    { path: "./commands/slash",   type: COMMAND_TYPE.SLASH   }
  ];

  const commands = await Promise.all(folders.flatMap(folder => 
    fs.readdirSync(folder.path)
      .filter(f => f.endsWith(".js"))
      .map(file => {
        return LoadFile(client, folder.type, path.join(folder.path, file))
      })
  ));
  
  for (const command of commands) {
    if (!command.name || !command.run) {
      console.warn(`[/!\\] Commande ignorée (manque nom/run) : ${command.file}`);
      continue;
    }

    const parsedname = command.name.toLowerCase().simplify().trim();

    const targetCollection = {
      [COMMAND_TYPE.MESSAGE]: client.textCommands,
      [COMMAND_TYPE.HYBRID]:  client.hybridCommands,
      [COMMAND_TYPE.SLASH]:   client.slashCommands,
    }[String(command.type)];
    
    targetCollection.set(parsedname, command);

    client.aliases.set(parsedname, parsedname);
    command.aliases.forEach(alias => {
      client.aliases.set(alias.toLowerCase().simplify().trim(), parsedname);
    });
  }
}
