import { Registry } from '#modules/Registry';
import { isSet } from './Misc.js';

// ===================================================================================================
//    _____      _   
//   / ____|    | |  
//  | (___   ___| |_ 
//   \___ \ / _ \ __|
//   ____) |  __/ |_ 
//  |_____/ \___|\__|
// ===================================================================================================

Set.isSet = isSet;

const SetFunctions = {
};

for (let key in SetFunctions) {
  Object.defineProperty(Set.prototype, key, {
    value: SetFunctions[key],
    enumerable: false,
    configurable: false,
    writable: true,
  });
}


// MARK: Register Module
Registry.register({
  name: "Set Utils",
  group: "utils",
  version: "2.0",
  details: [
    "Set.isSet",
    ...Object.keys(SetFunctions).map(s => `Set.prototype.${s}`),
  ]
});