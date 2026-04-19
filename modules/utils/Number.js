import { Registry } from '#modules/Registry';

// ===================================================================================================
//   _  _            _
//  | \| |_  _ _ __ | |__  ___ _ _
//  | .` | || | '  \| '_ \/ -_) '_|
//  |_|\_|\_,_|_|_|_|_.__/\___|_|
// ===================================================================================================
const NumberFunctions = {
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
};

Number.parseAbbreviatedNumber = function (str = '') {
  const suffixes = { k: 1e3, m: 1e6, b: 1e9, t: 1e12, q: 1e15, qa: 1e18, sx: 1e21, sp: 1e24 };

  const regex = /^([\d.,]+)\s*(qa|sx|sp|q|t|b|m|k)?$/i;
  const match = str.match(regex);
  if (!match) return null;

  const number = Number(match[1].replace(/,/g, ''));
  const suffix = match[2] ? match[2].toLowerCase() : '';
  const multiplier = suffixes[suffix] || 1;

  return number * multiplier;
};

for (let key in NumberFunctions) {
  Object.defineProperty(Number.prototype, key, {
    value: NumberFunctions[key],
    enumerable: false,
    configurable: false,
    writable: false,
  });
}



// MARK: Register Module
Registry.register({
  name: "Number Utils",
  version: "2.0",
  group: "utils",
  details: [
    "Number.parseAbbreviatedNumber",
    ...Object.keys(NumberFunctions).map(s => `Number.prototype.${s}`),
  ]
});