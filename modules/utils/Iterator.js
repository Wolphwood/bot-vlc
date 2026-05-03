import { Registry } from '#modules/Registry';

// ===================================================================================================
//   _____ _                 _             
//  |_   _| |               | |            
//    | | | |_ ___ _ __ __ _| |_ ___  _ __ 
//    | | | __/ _ \ '__/ _` | __/ _ \| '__|
//   _| |_| ||  __/ | | (_| | || (_) | |   
//  |_____|\__\___|_|  \__,_|\__\___/|_|   
// ===================================================================================================

const NativeIteratorPrototype = Object.getPrototypeOf(
  Object.getPrototypeOf([][Symbol.iterator]())
);

const IteratorFunctions = {
  toArray: function() {
    return [...this];
  },
  array: function() {
    console.warn(`Iterator.array is deprecated : please use [...iterator] or iterator.toArray()`);
    return [...this];
  },
  chunkOf: function(N) {
    return this.toArray().chunkOf(N);
  }
}

for (let key in IteratorFunctions) {
  if (!(key in NativeIteratorPrototype)) {
    Object.defineProperty(NativeIteratorPrototype, key, {
      value: IteratorFunctions[key],
      enumerable: false,
      configurable: true,
      writable: true
    });
  }
}

const deprecated = [
  "Iterator.prototype.array",
];
function markDeprecated(str) {
  if (deprecated.includes(str)) return `${str} \x1B[38;5;0m\x1B[48;5;208m(deprecated)\x1B[0m`;
  return str;
}

// MARK: Register Module
Registry.register({
  name: "Iterator Utils",
  group: "utils",
  version: "1.1",
  details: [
    ...Object.keys(IteratorFunctions).map(str => markDeprecated(`Iterator.prototype.${str}`)),
  ]
});