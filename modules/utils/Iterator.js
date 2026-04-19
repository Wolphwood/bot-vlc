import { Registry } from '#modules/Registry';

// ===================================================================================================
//   _____ _                 _             
//  |_   _| |               | |            
//    | | | |_ ___ _ __ __ _| |_ ___  _ __ 
//    | | | __/ _ \ '__/ _` | __/ _ \| '__|
//   _| |_| ||  __/ | | (_| | || (_) | |   
//  |_____|\__\___|_|  \__,_|\__\___/|_|   
// ===================================================================================================

const SetIteratorPrototype = Object.getPrototypeOf(new Set().values());

if (!SetIteratorPrototype.toArray) {
  Object.defineProperty(SetIteratorPrototype, 'toArray', {
    value: function() {
      console.warn(`Iterator.toArray is deprecated : please use [...iterator.values()] or iterator.array()`)
      
      const arr = [];
      let next = this.next();
      while (!next.done) {
        arr.push(next.value);
        next = this.next();
      }
      return arr;
    },
    enumerable: false,
    configurable: false,
    writable: false,
  });
}

Object.defineProperty(SetIteratorPrototype, 'array', {
  value: function () {
    return [...this.values()];
  },
  enumerable: false,
  configurable: false,
  writable: false,
});

// MARK: Register Module
Registry.register({
  name: "Iterator Utils",
  group: "utils",
  version: "1.0",
  details: [
    'SetIteratorPrototype.toArray  \x1B[38;5;0m\x1B[48;5;208m(deprecated)\x1B[0m',
    'SetIteratorPrototype.array',
  ]
});