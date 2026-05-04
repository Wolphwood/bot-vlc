import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const BLACKLIST = new Set(['node_modules', '.git', 'dist', '.vscode', 'counter.js', 'count.js', 'stats.txt', '$', 'logs', 'package.json', 'package-lock.json']);
const OUTPUT_FILE = 'stats.txt';
const ALLOWED_EXTENSIONS = [ '.js', '.json' ];

/**
 * Retire les codes de couleur ANSI pour l'export texte
 */
function stripAnsi(str) {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Analyse un fichier pour compter les différents types de lignes
 */
function getFileStats(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const stats = { code: 0, empty: 0, comment: 0 };

    lines.forEach(line => {
      const t = line.trim();
      if (t.length === 0) stats.empty++;
      else if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) stats.comment++;
      else stats.code++;
    });
    return stats;
  } catch { return { code: 0, empty: 0, comment: 0 }; }
}

/**
 * Scanne récursivement pour construire l'objet data
 */
function buildTreeData(dir) {
  const files = fs.readdirSync(dir);
  const data = [];
  const totalDirStats = { code: 0, empty: 0, comment: 0 };

  const entries = files.map(name => ({
    name,
    path: path.join(dir, name),
    isDir: fs.statSync(path.join(dir, name)).isDirectory()
  })).sort((a, b) => b.isDir - a.isDir || a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (BLACKLIST.has(entry.name)) continue;

    if (entry.isDir) {
      const { children, stats } = buildTreeData(entry.path);
      if (stats.code > 0) {
        data.push({
          label: `\x1b[36m${entry.name}/\x1b[0m`,
          info: `[\x1b[33mC:${stats.code}\x1b[0m | \x1b[32mM:${stats.comment}\x1b[0m | \x1b[90mV:${stats.empty}\x1b[0m]`,
          children: children
        });
        totalDirStats.code += stats.code;
        totalDirStats.comment += stats.comment;
        totalDirStats.empty += stats.empty;
      }
    } else if (ALLOWED_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      const stats = getFileStats(entry.path);
      if (stats.code > 0 || stats.comment > 0) {
        data.push({
          label: entry.name,
          info: `[\x1b[33mC:${stats.code}\x1b[0m | \x1b[32mM:${stats.comment}\x1b[0m | \x1b[90mV:${stats.empty}\x1b[0m]`
        });
        totalDirStats.code += stats.code;
        totalDirStats.comment += stats.comment;
        totalDirStats.empty += stats.empty;
      }
    }
  }
  return { children: data, stats: totalDirStats };
}

/**
 * Génère la structure en arbre
 */
export function generateTree(title, data) {
  let output = ` # === ${title}\n │\n`;

  const render = (items, prefix = "") => {
    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const connector = isLast ? " └── " : " ├── ";
      const info = item.info ? ` ${item.info}` : "";
      output += `${prefix}${connector}${item.label}${info}\n`;

      if (item.children && item.children.length > 0) {
        const nextPrefix = prefix + (isLast ? "     " : " │   ");
        render(item.children, nextPrefix);
      }
    });
  };

  render(data);
  return output;
}

// --- EXÉCUTION ---
console.clear();
const { children, stats } = buildTreeData(process.cwd());

// 1. Génération du rendu console (avec couleurs)
let fullOutput = generateTree("ANALYSE DÉTAILLÉE DU PROJET", children);
const footer = [
  "\n==========================================",
  ` \x1b[33mCode Utile     :\x1b[0m ${stats.code} lignes`,
  ` \x1b[32mCommentaires   :\x1b[0m ${stats.comment} lignes`,
  ` \x1b[90mLignes Vides   :\x1b[0m ${stats.empty} lignes`,
  " ----------------------------------------",
  ` \x1b[35mTOTAL RÉEL     :\x1b[0m ${stats.code + stats.comment + stats.empty} lignes`,
  "==========================================\n"
].join('\n');

const finalConsoleOutput = fullOutput + footer;

// 2. Affichage Console
console.log(finalConsoleOutput);

// 3. Export Fichier (Nettoyé des codes couleurs)
const cleanOutput = stripAnsi(finalConsoleOutput);
fs.writeFileSync(path.join(process.cwd(), OUTPUT_FILE), cleanOutput, 'utf-8');
fs.writeFileSync(path.join(process.cwd(), 'esc_' + OUTPUT_FILE), finalConsoleOutput, 'utf-8');

console.log(`\x1b[32m[OK] Rapport exporté avec succès dans : \x1b[1m${OUTPUT_FILE}\x1b[0m\n`);