import { Registry } from '#modules/Registry';

// ===================================================================================================
//   ___              _
//  | _ \__ _ _ _  __| |___ _ __
//  |   / _` | ' \/ _` / _ \ '  \
//  |_|_\__,_|_||_\__,_\___/_|_|_|
// ===================================================================================================
// #region Random
export function getRandomRange(min, max) {
  return Math.random() * (max - min) + min;
}
export function getRandomRangeFloor(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}
export function getRandomRangeCeil(min, max) {
  return Math.ceil(Math.random() * (max - min) + min);
}
export function getRandomRangeRound(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}


// MARK: Register Module
Registry.register({
  name: "Random Utils",
  group: "utils",
  version: "2.0",
  details: [
    "getRandomRange",
    "getRandomRangeFloor",
    "getRandomRangeCeil",
    "getRandomRangeRound",
  ]
});