import util from 'util';
import fs from 'fs';
import path from 'path';
import config from '#config';
import { getRandomRangeRound } from './Utils.js';

const original = {
  log: console.log,
  warn: console.warn,
  info: console.info,
  error: console.error,
};

// Configuration
const DEBUG_ENABLED = config.debug || false;


const LOG_DIR = path.join(process.cwd(), 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

const getLogStream = () => {
  const today = new Date().toISOString().split('T')[0];
  return fs.createWriteStream(path.join(LOG_DIR, `${today}.log`), { flags: 'a' });
};

let logStream = getLogStream();

// Utilitaire pour l'écriture dans les fichiers logs
const writeToLog = (level, ...args) => {
  const timestamp = new Date().toLocaleTimeString('fr-FR', { hour12: false });
  
  const message = args.map(arg => {
    if (typeof arg === 'object') return JSON.stringify(arg, (k,v) => typeof v == 'bigint' ? v.toString() : v, 2);
    return String(arg).replace(/\x1B\[[0-9;]*m/g, '');
  }).join(' ');

  const entry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
  logStream.write(entry);
};

// Générateur de timestamp [DD-MM-YYYY HH:mm:ss]
const getTimestamp = () => {
  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const y = now.getFullYear();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  return `[${d}-${m}-${y} ${h}:${min}:${s}]`;
};

// --- Extension de la console ---

// llog : Log brut sans timestamp (pour tes titres/arbres)
console.llog = (...args) => {
  writeToLog('log', ...args);
  original.log(...args);
};

console.log = (...args) => {
  const ts = getTimestamp();
  writeToLog('log', ts, ...args);
  original.log(ts, ...args);
};

console.warn = (...args) => {
  const ts = getTimestamp();
  writeToLog('warn', ts, ...args);
  original.warn(`${ts} \x1B[38;5;0m\x1B[48;5;208m[ WARN ]\x1B[0m`, ...args);
};

console.info = (...args) => {
  const ts = getTimestamp();
  writeToLog('info', ts, ...args);
  original.info(`${ts} \x1B[38;5;0m\x1B[48;5;27m[ INFO ]\x1B[0m`, ...args);
};

console.error = (...args) => {
  const ts = getTimestamp();
  writeToLog('error', ts, ...args);
  original.error(`${ts} \x1B[38;5;0m\x1B[48;5;196m[ ERROR ]\x1B[0m`, ...args);
};

console.fatal = (...args) => {
  const ts = getTimestamp();
  const width = process.stdout.columns || 80;
  const char = "*";

  const L = (...args) => {
    writeToLog('fatal', ts, ...args);
    
    // On traite le contenu pour en faire une seule string stylisée
    const formatted = args
      .map(a => typeof a == 'string' ? a : util.inspect(a, { depth: null, colors: false }))
      .join(' ') // On simule le comportement de console.log pour les multiples args
      .split('\n')
      .map(line => `\x1B[38;5;0m\x1B[48;5;196m\x1B[K${line}\x1B[0m`)
      .join('\n');

    original.error(formatted);
  };

  L((char).repeat(width));
  L("FATAL ERROR DETECTED");
  L("");
  L(...args);
  L("");
  L((char).repeat(width));
};

console.blank = (n = 1) => {
  if (n == 1) return original.log(''); 
  original.log('\n'.repeat(Math.max(0, n - 1)));
};

console.debug = (...args) => {
  if (!DEBUG_ENABLED) return;
  console.log('\x1B[38;5;0m\x1B[48;5;245m[ DEBUG ]\x1B[0m', ...args);
};

console.inspect = (...args) => {
  args.forEach(arg => {
    console.llog(util.inspect(arg, { 
      showHidden: false,
      maxArrayLength: null,
      maxStringLength: null,
      depth: null,
      colors: true 
    }));
  });
};

export default console;