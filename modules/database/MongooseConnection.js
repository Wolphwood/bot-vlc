import mongoose from 'mongoose';
import config from '#config';
import { Registry } from '#modules/Registry';

Registry.register({
  name: "Mongoose Connection",
  group: "database",
  version: "1.1",
  details: ['db_connect', 'status']
});

const uri = `mongodb://${config.bdd.host}/${config.bdd.name}`;

export function db_connect() {
  mongoose.connect(uri);
}

const db = mongoose.connection;

db.on('error', (err) => console.error('[MONGO] Erreur:', err));
db.on('connecting', () => console.info('[MONGO] Connexion en cours...'));
db.once('open', () => console.log('[OK] \x1B[32m[MONGO]\x1B[0m Connexion réussie !'));

db.on('disconnected', () => {
  console.warn('[MONGO] Déconnecté. Tentative de reconnexion dans 5s...');
  setTimeout(() => {
    db_connect().catch(err => console.error('[MONGO] Échec reconnexion:', err));
  }, 5000);
});

db_connect();

export default db;