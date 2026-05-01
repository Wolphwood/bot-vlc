import sharp from 'sharp';

import { pathToFileURL, fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

import { Registry } from '#modules/Registry';
Registry.register({
  name: "Misc Utils",
  group: "utils",
  version: '2.1.0',
  details: [
    'noop',
    'selfnoop',
    'FilterNonNullish',
    'Wait',
    'isObject',
    'isArray',
    'isSet',
    'isMap',
    'isBoolean',
    'isKindOfObject',
    'isString',
    'isNumber',
    'isFunction',
    'isEmpty',
    'isNull',
    'isDefined',
    'KeyOf',
    'ValidateBoolean',
    'ValidateObject',
    'ValidateArray',
    'ValidateString',
    'ValidateNumber',
    'MD5',
    'ConvertUrlToBase64',
    'deleteAfter',
    'generateEasyPassword',
    'uncachedImport',
  ]
});

// ===================================================================================================
//   __  __ ___ ___  ___
//  |  \/  |_ _/ __|/ __|
//  | |\/| || |\__ \ (__
//  |_|  |_|___|___/\___|
// ==================================================================================================
export const noop = () => {}

export function selfnoop(e) {
  return e;
}
export function FilterNonNullish(e, i, l) {
  return e ?? false;
}

export const Wait = (ms) => new Promise(rs => setTimeout(rs, ms));

export const isObject = (o) => o?.constructor === Object;
export const isArray = (o) => Array.isArray(o);
export const isSet = (o) => o instanceof Set;
export const isMap = (o) => o instanceof Map;

export const isBoolean = (o) => typeof o == 'boolean';
export const isKindOfObject = (o) => typeof o == 'object';
export const isString = (o) => typeof o == 'string';
export const isNumber = (o) => typeof o == 'number';
export const isFunction = (o) => typeof o == 'function';

export function isEmpty(o) {
  return isString(o) || isArray(o) ? o.length == 0 : isObject(o) ? Object.keys(o).length == 0 : false;
}
export const isNull = (o) => o === null;
export const isDefined = (o) => typeof o !== 'undefined';

export function KeyOf(k, o) {
  return isObject(o) ? o.hasOwnProperty(k) : isArray(o) ? o.includes(k) : false;
}

export function ValidateBoolean(o, d) {
  return isBoolean(o) ? o : d;
}
export function ValidateObject(o, d) {
  return isObject(o) ? o : d;
}
export function ValidateArray(o, d) {
  return isArray(o) ? o : d;
}
export function ValidateString(o, d) {
  return isString(o) ? o : d;
}
export function ValidateNumber(o, d) {
  return isNumber(o) ? o : d;
}

export function deleteAfter(message, ms = 5000) {
  return Wait(ms).then(() => message.delete()).catch(noop);
}

export const MD5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}

export async function ConvertUrlToBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement : ${response.statusText} (code ${response.status})`);
    }

    // Obtenez le type MIME pour construire la chaîne Base64
    const mimeType = response.headers.get('content-type'); // Exemple : "image/png"
    if (!mimeType || !mimeType.startsWith('image/')) {
      throw new Error('Le contenu téléchargé n\'est pas une image valide.');
    }
    

    // Utilisez arrayBuffer pour lire les données binaires
    const arrayBuffer = await response.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);

    // const metadata = await sharp(buffer).metadata();

    // const maxSize = 0.5 * 1024 * 1024; // 0.5 Mo en octets
    // if (metadata.size > maxSize) {
    //   const factor = maxSize / metadata.size;
    //
    //   if (metadata.width > metadata.height) {
    //     buffer = await sharp(buffer).resize({ width: Math.round(metadata.width * factor) }).toBuffer();
    //   } else {
    //     buffer = await sharp(buffer).resize({ height: Math.round(metadata.height * factor) }).toBuffer();
    //   }
    // }

    // Convertissez le buffer en Base64
    const base64Data = buffer.toString('base64');
    const base64String = `data:${mimeType};base64,${base64Data}`;

    // Retournez la chaîne en Base64
    return base64String;
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
}

export async function SaveUrlToLocal(url, folder, name) {
  const MAX_SIZE = 1 * 1024 * 1024; // 1 Mo

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const mimeType = response.headers.get('content-type');
    if (!mimeType?.startsWith('image/')) throw new Error('Pas une image.');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

    // Si déjà WebP ET léger, on ne touche à rien
    if (mimeType === 'image/webp' && buffer.length <= MAX_SIZE) {
      const filename = `${name}.webp`;
      await fs.promises.writeFile(path.join(folder, filename), buffer);
      return filename;
    }

    // Sinon : Conversion / Compression forcée
    const filename = `${name}.webp`;
    const finalPath = path.join(folder, filename);

    await sharp(buffer)
      .rotate()
      .resize({ 
        width: 1024, 
        height: 1024, 
        fit: 'inside', 
        withoutEnlargement: true 
      })
      .webp({ 
        quality: 75,      // Le "sweet spot" entre poids et fidélité
        smartSubsample: true, // Améliore la qualité des dégradés et couleurs vives
        effort: 4         // CPU moyen pour une meilleure compression
      })
      .toFile(finalPath);

    return filename;
  } catch (error) {
    console.error('Erreur SaveUrlToLocal:', error.message);
    return null;
  }
}

export function ExtractUrlsFromContent(element) {
  return element.content.match(/(http|ftp|https):\/\/([\w_-]+(?:(?:\.[\w_-]+)+))([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])/gi) ?? [];
}

export function ExtractUrlsFromAttachments(element) {
  return element.attachments.values().array().flatMap(e => {
    return e.contentType.startsWith('image/') ? e.proxyURL : null
  }).filter(e => e !== null);
}

export function generateEasyPassword(length = 3) {
  const consonants = "bcdfghjklmnpqrstvwxz";
  const vowels = "aeiouy";
  let password = "";

  // On utilise l'API Crypto pour un aléatoire de qualité sécurisée
  const randomValues = new Uint32Array(length * 2);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    // Une consonne suivie d'une voyelle
    const cIndex = randomValues[i * 2] % consonants.length;
    const vIndex = randomValues[i * 2 + 1] % vowels.length;
    
    password += consonants[cIndex] + vowels[vIndex];
  }

  return password;
}

export async function uncachedImport(filePath) {
  try {
    let absolutePath;

    if (filePath.startsWith('#')) {
      const cleanAlias = filePath.replace('#', '');
      absolutePath = path.resolve(process.cwd(), cleanAlias);
    } else {
      const stack = new Error().stack;
      const callerLine = stack.split('\n')[2];
      const startIdx = callerLine.indexOf('file:///');
      const endIdx = callerLine.lastIndexOf(':');
      const secondEndIdx = callerLine.lastIndexOf(':', endIdx - 1);
      const callerFileUrl = callerLine.slice(startIdx, secondEndIdx).trim();
      
      absolutePath = path.resolve(path.dirname(fileURLToPath(callerFileUrl)), filePath);
    }

    if (!absolutePath.endsWith('.js')) {
      absolutePath += '.js';
    }

    const fileUrl = pathToFileURL(absolutePath);
    fileUrl.search = `?v=${Date.now()}`;

    return await import(fileUrl.href);
  } catch (error) {
    console.error(`[UncachedImport] Échec sur : ${filePath}`);
    throw error;
  }
}