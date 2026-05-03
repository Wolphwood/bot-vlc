import { Registry } from '#modules/Registry';

// ===================================================================================================
//   ___ _       _
//  / __| |_ _ _(_)_ _  __ _
//  \__ \  _| '_| | ' \/ _` |
//  |___/\__|_| |_|_||_\__, |
// =================== |___/ =========================================================================
// #region String
const StringFunctions = {
  between: function (min, max, include = true) {
    if (include) return this >= min && this <= max;
    return this > min && this < max;
  },
  toAbbreviated(value) {
    let newValue = value;
    const suffixes = ['', 'k', 'm', 'b', 't', 'q', 'Qa', 'Sx', 'Sp'];
    let suffixNum = 0;
    while (newValue >= 1000) {
      newValue /= 1000;
      suffixNum++;
    }

    newValue = newValue.toPrecision(3);

    newValue += suffixes[suffixNum];
    return newValue;
  },
  // simplify: function () { // legacy
  //   let letters = { À: 'A', Á: 'A', Â: 'A', Ã: 'A', Ä: 'A', Å: 'A', à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', Ç: 'C', ç: 'c', È: 'E', É: 'E', Ê: 'E', Ë: 'E', è: 'e', é: 'e', ê: 'e', ë: 'e', Ì: 'I', Í: 'I', Î: 'I', Ï: 'I', ì: 'i', í: 'i', î: 'i', ï: 'i', Ñ: 'N', ñ: 'n', Ò: 'O', Ó: 'O', Ô: 'O', Õ: 'O', Ö: 'O', Ø: 'O', ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o', ß: 's', Ù: 'U', Ú: 'U', Û: 'U', Ü: 'U', ù: 'u', ú: 'u', û: 'u', ü: 'u', Ÿ: 'Y', ÿ: 'y', Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe' };
  //   return this.replace(/[À-ÏÑ-ÖØ-Üß-åæ-ïñ-öø-üÿŒœŸ]/g, (letter) => letters[letter]);
  // },
  simplify: function () {
    return this
    .replace(/Æ|æ|Œ|œ/gm, (l) => ({ Æ: 'AE', æ: 'ae', Œ: 'OE', œ: 'oe' })[l])
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  },
  ucFirst: function () {
    console.warn('String.prototype.ucFirst is deprecated, use String.prototype.toUcFirst instead');
    return this.substring(0, 1).toUpperCase() + this.substring(1);
  },
  toUcFirst: function () {
    return this.substring(0, 1).toUpperCase() + this.substring(1).toLowerCase();
  },
  similarity: function (s1, s2) {
    function editDistance(s1, s2) {
      s1 = s1.toLowerCase();
      s2 = s2.toLowerCase();

      let costs = new Array();
      for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
          if (i == 0) {
            costs[j] = j;
          } else {
            if (j > 0) {
              let newValue = costs[j - 1];

              if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }

              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) {
          costs[s2.length] = lastValue;
        }
      }

      return costs[s2.length];
    }

    let longer = s1;
    let shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }

    let longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
  },
  randomCase: function (p = 0.5) {
    if (p > 1) p = 1;
    if (p < 1) p = 0;

    return this.split('')
      .map((s) => {
        if (Math.random() >= 1 - p) {
          return s.toUpperCase();
        } else return s.toLowerCase();
      })
      .join('');
  },
  invertCase: function () {
    return this.split('')
      .map((s) => {
        if (s.toLowerCase() === s) {
          return s.toUpperCase();
        } else return s.toLowerCase();
      })
      .join('');
  },
  limit: function(len = 20) {
    return this.length > Math.max(1, len) ? this.slice(0, Math.max(1,len-1))+"…" : this;
  },
};

const deprecated = [
  "String.prototype.ucFirst",
];
function markDeprecated(str) {
  if (deprecated.includes(str)) return `${str} \x1B[38;5;0m\x1B[48;5;208m(deprecated)\x1B[0m`;
  return str;
}

for (let key in StringFunctions) {
  Object.defineProperty(String.prototype, key, {
    value: StringFunctions[key],
    enumerable: false,
    configurable: false,
    writable: false,
  });
}


// MARK: Register Module
Registry.register({
  name: "String Utils",
  group: "utils",
  version: "2.0",
  details: [
    ...Object.keys(StringFunctions).map(s => markDeprecated(`String.prototype.${s}`)),
  ]
});