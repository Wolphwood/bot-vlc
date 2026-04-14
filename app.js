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

fs.readdirSync('./assets/langs/').forEach(file => {
  if (file.endsWith('.json')) {
    let content = fs.readFileSync(path.join('./assets/langs/', file), 'utf-8');
    Locales.registerLocale(file.slice(0,-5), JSON.parse(content));
  }
});

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
