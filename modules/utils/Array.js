import { Registry } from '#modules/Registry';

// ===================================================================================================
//     _   ___ ___    _ __   __
//    /_\ | _ \ _ \  /_\\ \ / /
//   / _ \|   /   / / _ \\ V /
//  /_/ \_\_|_\_|_\/_/ \_\|_|
// ===================================================================================================
const ArrayFunctions = {
  unique: function () {
    return Array.from(new Set(this));
  },
  chunkOf: function (size) {
    let arr = [];
    for (let i = 0; i < this.length / size; i++) {
      arr.push(this.slice(i * size, (i + 1) * size));
    }

    return arr;
  },
  divide: function (parts) {
    if (parts <= 0) return this;

    const result = [];
    const partSize = Math.ceil(this.length / parts);

    for (let i = 0; i < this.length; i += partSize) {
      result.push(this.slice(i, i + partSize));
      parts--;
    }

    return result;
  },
  toLowerCase: function () {
    return this.map((v) => (typeof v === 'string' ? v.toLocaleLowerCase() : v));
  },
  toUpperCase: function () {
    return this.map((v) => (typeof v === 'string' ? v.toUpperCase() : v));
  },
  simplify: function () {
    return this.map((v) => (typeof v === 'string' ? v.simplify() : v));
  },
  fromLast: function (n = 0) {
    return this[this.length - 1 - n];
  },
  last: function () {
    return this[this.length - 1];
  },
  get: function (index) {
    console.warn("array.get is deprecated, please use array.at instead")
    if (index < 0) return this[this.length + index];
    return this[index];
  },
  getRandomIndex: function () {
    return Math.floor(Math.random() * this.length);
  },
  getRandomElement: function () {
    return this[Math.floor(Math.random() * this.length)];
  },
  outRandomElement: function () {
    let rdm = Math.floor(Math.random() * this.length);
    let el = this[rdm];
    this.splice(rdm, 1);
    return el;
  },
  shuffle: function () {
    for (let i = this.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [this[i], this[j]] = [this[j], this[i]];
    }
    return this;
  },
  promise: function () {
    return Promise.all(this);
  },
};

const ArrayGetters = {
  lastIndex: function () {
    return this.findLastIndex(() => true);
  },
};

for (let key in ArrayFunctions) {
  Object.defineProperty(Array.prototype, key, {
    value: ArrayFunctions[key],
    enumerable: false,
    configurable: false,
    writable: false,
  });
}

for (let key in ArrayGetters) {
  Object.defineProperty(Array.prototype, key, {
    get: ArrayGetters[key],
    enumerable: false,
    configurable: false,
  });
}


const deprecated = [
  "Array.prototype.get",
];
function markDeprecated(str) {
  if (deprecated.includes(str)) return `${str} \x1B[38;5;0m\x1B[48;5;208m(deprecated)\x1B[0m`;
  return str;
}

// MARK: Register Module
Registry.register({
  name: "Array Utils",
  group: "utils",
  version: "2.0",
  details: [
    ...Object.keys(ArrayFunctions).map(str => markDeprecated(`Array.prototype.${str}`)),
    ...Object.keys(ArrayGetters).map(str => markDeprecated(`Array.prototype.${str} (get)`)),
  ]
});