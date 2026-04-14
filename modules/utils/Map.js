import { Registry } from '#modules/Registry';

// ===================================================================================================
//   __  __
//  |  \/  |__ _ _ __
//  | |\/| / _` | '_ \
//  |_|  |_\__,_| .__/
// ============ |_| ==================================================================================
const MapFunctions = {
  rename: function (key, new_key) {
    if (typeof this.get(new_key) !== 'undefined') throw new Error(`Can't rename key : '${new_key}' already exist`);
    if (this.get(key) === 'undefined') throw new Error(`Can't rename key : '${key}' doesn't exist`);
    this.set(new_key, this.get(key));
    this.delete(key);

    return this;
  },
  copy: function (key, new_key) {
    if (!this.get(key)) throw new Error(`Can't copy key : '${key}' doesn't exist`);
    this.set(new_key, this.get(key));

    return this;
  },
  clone: function () {
    let output = new Map();

    for (let key of this.keys()) {
      output.set(key, output.get(key));
    }

    return output;
  },
  forEachKeys: function (callback) {
    let elements = Array.from(this.keys()).map((k) => this.get(k));

    Array.from(this.keys()).forEach((key, index, keys) => {
      callback.call(this, key, this.get(key), index, keys, elements, this);
    });
  },
};

for (let key in MapFunctions) {
  Object.defineProperty(Map.prototype, key, {
    value: MapFunctions[key],
    enumerable: false,
    configurable: false,
    writable: false,
  });
}

const mapIteratorPrototype = Object.getPrototypeOf(new Map().keys());

Object.defineProperty(mapIteratorPrototype, 'array', {
  value: function () {
    return Array.from(this);
  },
  enumerable: false,
  configurable: false,
  writable: false,
});

// MARK: Register Module
Registry.register({
  name: "Random Utils",
  group: "utils",
  version: "2.0",
  details: [
    "MapIterator.array",
    ...Object.keys(MapFunctions).map(s => `Map.prototype.${s}`),
  ]
});