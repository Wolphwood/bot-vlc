import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export async function load(client) {
  const eventsPath = './events';
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f !==  'index.js' && f.endsWith('.js')).map(file => path.join(eventsPath, file));

  for (const file of eventFiles) {
    const fileUrl = pathToFileURL(path.resolve(file)).href;
    
    // Import dynamique du fichier d'event
    const { default: event } = await import(fileUrl);

    if (!event.name || !event.run) {
      console.warn(`[/!\\] Événement ignoré (manque nom/run) : ${file}`);
      continue;
    }

    if (event.once) {
      client.once(event.name, (...parameters) => event.run({ client, parameters }));
    } else {
      client.on(event.name, (...parameters) => event.run({ client, parameters }));
    }
  }
}