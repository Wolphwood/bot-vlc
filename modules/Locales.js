import { Registry } from '#modules/Registry';
Registry.register({
  name: "Lang Manager",
  version: "1.0",
  details: [
  "Locales",
  "LocaleManager",
  ]
});

import fs from "fs";
import path from "path";

import {
  isBoolean, isObject, isArray, isString, isNumber, isEmpty, isNull, isDefined,
  noop, selfnoop, KeyOf,
  ValidateBoolean, ValidateObject, ValidateArray, ValidateString, ValidateNumber,
} from "#modules/Utils"
import { pathToFileURL } from 'url';

let LANGS = {};

class LocaleManager {
  #locales;
  #defaultLang;
  #lang;
  #settings;
  #cache;

  constructor(options) {
    let { locales, defaultLang, lang } = ValidateObject(options, {});

    this.#cache = new Map();

    this.#settings = {
      AllowUnregisterdLang: true,
    }

    this.#locales = { ...ValidateObject(locales, LANGS) };
    
    this.#defaultLang = ValidateString(defaultLang, 'en').toLowerCase();
    this.#lang = ValidateString(lang, this.#defaultLang).toLowerCase();
  }

  async loadFolder(basePath) {
    if (!fs.existsSync(basePath)) {
      throw new Error(`[LocaleManager] Root directory not found: ${basePath}`);
    }

    const folders = fs.readdirSync(basePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory());

    for (let folder of folders) {
      const langCode = folder.name.toLowerCase().simplify();
      const folderPath = path.join(basePath, folder.name);
      
      await this.loadLangFolder(langCode, folderPath);
    }
  }

  async loadLangFolder(langCode, folderPath) {
    if (!fs.existsSync(folderPath)) {
      console.warn(`[LocaleManager] Lang directory not found: ${folderPath}`);
      return;
    }

    const files = fs.readdirSync(folderPath, { recursive: true })
      .filter(file => file.endsWith('.js') || file.endsWith('.json'));
    
    for (let file of files) {
      const filePath = path.join(folderPath, file);
      const isJson = file.endsWith('.json')

      try {
        const fileUrl = pathToFileURL(filePath).href;
        const module = isJson 
          ? await import(fileUrl, { with: { type: 'json' } })
          : await import(fileUrl)
        ;
        
        const data = module.default || module;
        
        this.registerLocale(langCode.toLowerCase(), data);
      } catch (err) {
        console.error(`[LocaleManager] Error loading file ${file} for lang ${langCode}:`, err);
      }
    }
  }

  getLocales() {
    return this.#locales;
  }

  getDefaultLang() {
    return this.#defaultLang;
  }
  setDefaultLang(lang) {
    if (KeyOf(lang, this.#locales)) {
      return this.#defaultLang = lang.toLowerCase();
    } else {
      return this.#defaultLang;
    }
  }
  isLangExist(lang) {
    return KeyOf(lang.toLowerCase(), this.#locales);
  }
  getLang() {
    return this.#lang;
  }
  getLangs() {
    return Object.keys(this.#locales);
  }
  setLang(lang) {
    if (!isString(lang) && !isEmpty(lang)) throw new Error(`Class LocaleManager (setLang): "lang" must be a valid string.`);

    const was = this.#lang;

    if (lang.toLowerCase() === "default") {
      this.#lang = this.#defaultLang;
    } else
    if (!KeyOf(lang.toLowerCase(), this.#locales)) {
      let error = new Error(`Class LocaleManager (setLang): "lang" must be registered lang.`);
      if (this.#settings.AllowUnregisterdLang) {
        console.warn(error);
      } else {
        throw error;
      }
    }
    
    this.#lang = lang.toLowerCase();
    
    if (this.#lang !== was) this.#cache.clear();

    return this.#lang;
  }
  getNearestLang(lang) {
    let [generic, region] = lang.split(/[_-]/gi);

    // Return Current Asked Lang
    if (KeyOf(lang.toLowerCase(), this.#locales)) return lang.toLowerCase();
    
    // Return Nearest generic Lang
    if (KeyOf(generic, this.#locales)) {
      return generic.toLowerCase();
    }

    // Return Any other Region if possible
    let randomOther = Object.keys(this.#locales).filter(l => l.startsWith(generic)).getRandomElement();
    if (randomOther) return randomOther;

    return null;
  }

  registerLocales(locales) { // ⚠ Will override existings keys
    if (isObject(locales) && !isEmpty(locales)) {
      for (let key of Object.keys(locales)) {
        if (isDefined(locales[key]) && !isEmpty(locales[key])) {
          this.registerLocale(key, locales[key]);
        }
      }
    }
  }
  registerLocale(lang, locale) { // ⚠ Will override existings keys
    this.#cache.clear();

    this.#locales[lang.toLowerCase()] = Object.assign(
      ValidateObject(this.#locales[lang.toLowerCase()], {}),
      ValidateObject(locale, {}),
    )
  }
  registerKey(key, value, lang = null) {
    if (!isString(key) || isEmpty(key)) throw new Error(`Class LocaleManager (RegisterKey): "key" must be a valid string.`);
    
    const targetLang = (lang ?? this.#lang).toLowerCase();
    
    if (!this.#locales[targetLang]) {
      this.#locales[targetLang] = {};
    }

    this.#locales[targetLang][key] = value;
    this.#cache.clear(); // On invalide le cache
  }
 
  getKeyValue(key, options) {
    const targetLang = options.lang ?? this.#lang;
    const cacheKey = `${key}:${targetLang}:${this.#defaultLang}`;
    
    if (this.#cache.has(cacheKey)) return this.#cache.get(cacheKey);

    const Search = (k, l) => {
        if (!isString(l) || isEmpty(l)) return null; 
        l = l.toLowerCase(); // Normalisation

        if (KeyOf(l, this.#locales)) {
        let value = this.#locales[l][k];
        if (isDefined(value) && !isEmpty(value)) return value;
        }
        
        // On simplifie la regex pour la performance
        if (l.includes('-') || l.includes('_')) {
        let genericLang = l.split(/[_-]/gi)[0];
        if (KeyOf(genericLang, this.#locales)) {
            let value = this.#locales[genericLang][k];
            if (isDefined(value) && !isEmpty(value)) return value;
        }
        }
        return null;
    }

    const result = Search(key, targetLang) ?? Search(key, this.#lang) ?? Search(key, this.#defaultLang) ?? null;
    
    // On ne cache que si on a trouvé quelque chose pour éviter de saturer la RAM avec des clés inexistantes
    if (result) this.#cache.set(cacheKey, result);
    
    return result;
    }

  getRaw(key, options = {}) {
    let value = this.getKeyValue(key, options);

    if (isString(value)) {
      return value;
    }

    if (isArray(value)) {
      if (options.array === true) {
        return value;
      } else {
        return value.getRandomElement();
      }
    }

    if (options.fallback) {
      let fallback = options.fallback;
      delete options.fallback;

      return this.getRaw(fallback, args, options); 
    }
    
    return options.default ?? (options.null === true ? null : key);
  }
  
  get(key, args = null, options = {}) {
    let value = this.getKeyValue(key, options);

    if (isString(value)) {
      return this.formatString(value, args);
    }

    if (isArray(value)) {
      if (options.array === true) {
        return value.map(string => this.formatString(string, args));
      } else {
        return this.formatString(value.getRandomElement(), args);
      }
    }
    
    if (options.fallback) {
      let fallback = options.fallback;
      delete options.fallback;

      return this.get(fallback, args, options); 
    }

    return options.default ?? (options.null === true ? null : key);
  }

  use(options) {
    return {
      getRaw: (key, args, opt) => this.getRaw(key, args, { ...options, ...opt }),
      get: (key, args, opt) => this.get(key, args, { ...options, ...opt }),
    }
  }

  formatString(string, args = []) {
    if (typeof args === 'undefined' || args == null) return string;
    if (!Array.isArray(args)) args = [args];
    if (args.length === 0) return string;

    let autoIndex = -1; // On renomme pour plus de clarté
    return string.replace(/\%([0-9]*)([asdifuxX])/g, (match, argindex, specifier) => {
        // Si argindex est vide, on utilise l'auto-incrément, sinon on utilise l'index spécifié
        const useAuto = argindex.length === 0;
        if (useAuto) autoIndex++;
        
        let value = args[useAuto ? autoIndex : Number(argindex)];

        if (!isDefined(value)) return match;

        switch (specifier) {
        case 'a': return value;
        case 's': return String(value);
        case 'd':
        case 'i': return parseInt(value);
        case 'f': return parseFloat(value).toFixed(2);
        case 'u': return Math.abs(parseInt(value));
        case 'x': return parseInt(value).toString(16);
        case 'X': return parseInt(value).toString(16).toUpperCase();
        default: return match;
        }
    });
  }
}

const Locales = new LocaleManager();
export default Locales;

export {
  Locales,
  LocaleManager,
}