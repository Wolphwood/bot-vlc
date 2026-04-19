import { Registry } from '#modules/Registry';
import { isObject } from './Misc.js';

// ===================================================================================================
//    ___  _     _        _
//   / _ \| |__ (_)___ __| |_
//  | (_) | '_ \| / -_) _|  _|
//   \___/|_.__// \___\__|\__|
// ========== |__/ ===================================================================================

Object.merge = function merge(target, ...sources) {
  if (sources.length < 1) return target;

  for (let source of sources) {
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (source[key] && isObject(source[key])) { 
            if (!target[key]) target[key] = {};
            merge(target[key], source[key]);
          }
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }
  }

  return target;
};

Object.isObject = isObject;

const ObjectFunctions = {
  only: function () {
    let copy = {};
    for (let key of [...arguments].flat()) {
      copy[key] = this[key];
    }
    return copy;
  },
  entries: function () {
    return Array.from(Object.entries(this));
  },
  keys: function () {
    return Array.from(Object.keys(this));
  },
  values: function () {
    return Array.from(Object.values(this));
  },
  hasKey: function(key) {
    return Object.keys(this).includes(key);
  },
};

for (let key in ObjectFunctions) {
  Object.defineProperty(Object.prototype, key, {
    value: ObjectFunctions[key],
    enumerable: false,
    configurable: false,
    writable: true,
  });
}



// MARK: Register Module
Registry.register({
  name: "Object Utils",
  group: "utils",
  version: "2.0",
  details: [
    "Object.merge",
    ...Object.keys(ObjectFunctions).map(s => `Object.prototype.${s}`),
  ]
});