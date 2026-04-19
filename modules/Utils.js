// 1. Re-export TOUS les membres nommés de chaque fichier (C'est ça qui répare ton erreur)
export * from './utils/Array.js';
export * from './utils/Date.js';
export * from './utils/Iterator.js';
export * from './utils/Map.js';
export * from './utils/Math.js';
export * from './utils/Misc.js';
export * from './utils/Number.js';
export * from './utils/Object.js';
export * from './utils/Random.js';
export * from './utils/Set.js';
export * from './utils/String.js';
export * from './utils/Discord.js';
export * from './utils/FunnyErrorMessages.js';

// 2. Si tu veux quand même garder les Namespaces (ex: Utils.Math.clamp)
import * as ArrayUtils from './utils/Array.js';
import * as DateUtils from './utils/Date.js';
import * as IteratorUtils from './utils/Iterator.js';
import * as MapUtils from './utils/Map.js';
import * as MathUtils from './utils/Math.js';
import * as MiscUtils from './utils/Misc.js';
import * as NumberUtils from './utils/Number.js';
import * as ObjectUtils from './utils/Object.js';
import * as RandomUtils from './utils/Random.js';
import * as SetUtils from './utils/Set.js';
import * as StringUtils from './utils/String.js';
import * as DiscordUtils from './utils/Discord.js';
import * as FunnyErrorMessagesUtils from './utils/FunnyErrorMessages.js';

export {
  ArrayUtils as Array,
  DateUtils as Date,
  IteratorUtils as Iterator,
  MapUtils as Map,
  MathUtils as Math,
  MiscUtils as Misc,
  NumberUtils as Number,
  ObjectUtils as Object,
  RandomUtils as Random,
  SetUtils as Set,
  StringUtils as String,
  DiscordUtils as Discord,
  FunnyErrorMessagesUtils as FunnyErrorMessages,
};

// 3. Ton export default pour l'objet global
export default {
  ...ArrayUtils,
  ...DateUtils,
  ...IteratorUtils,
  ...MapUtils,
  ...MathUtils,
  ...MiscUtils,
  ...NumberUtils,
  ...ObjectUtils,
  ...RandomUtils,
  ...SetUtils,
  ...StringUtils,
  ...DiscordUtils,
  ...FunnyErrorMessagesUtils,
};