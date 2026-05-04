import '#modules/console';
import '#modules/Utils';
import '#modules/database/Manager';
import config from "#config";
import { load as LoadCommands } from "#commands/index";
import { load as LoadEvents } from "#events/index";
import { Client, Collection } from 'discord.js';

import fs from 'fs';
import path from 'path';

import Locales from '#modules/Locales';

// Gestion des erreurs fatales (Exceptions non capturées)
process.on('uncaughtException', (err) => {
  console.fatal('UNCAUGHT EXCEPTION:', err);
  // On laisse un peu de temps au flux d'écriture pour finir avant de couper
  setTimeout(() => process.exit(1), 500);
});

// Gestion des promesses rejetées non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.fatal('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

await Locales.loadFolder("./assets/langs/");
Locales.setDefaultLang('en');
Locales.setLang('fr');

// MARK: Client
const client = new Client({ intents: config.intents, partials: config.partials });

client.config = { ...config };
client.APIs = new Collection();

client.textCommands = new Collection();
client.slashCommands = new Collection();
client.hybridCommands = new Collection();
client.aliases = new Collection();
client.APIs = [];

export default client;

await LoadCommands(client);
await LoadEvents(client);

client.login(config.token);
