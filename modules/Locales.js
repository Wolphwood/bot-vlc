const {
    isBoolean, isObject, isArray, isString, isNumber, isEmpty, isNull, isDefined,
    noop, selfnoop, KeyOf,
    ValidateBoolean, ValidateObject, ValidateArray, ValidateString, ValidateNumber,
} = require("./functions/Utils.js");

let LANGS = {};

class LocaleManager {
    #locales;
    #defaultLang;
    #lang;
    #settings;

    constructor(options) {
        let { locales, defaultLang, lang } = ValidateObject(options, {});

        this.#settings = {
            AllowUnregisterdLang: true,
        }

        this.#locales = ValidateObject(locales, LANGS);
        
        this.#defaultLang = ValidateString(defaultLang, 'en').toLowerCase();
        this.#lang = ValidateString(lang, this.#defaultLang).toLowerCase();
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

        return this.#lang = lang.toLowerCase();
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
        this.#locales[lang.toLowerCase()] = Object.assign(
            ValidateObject(this.#locales[lang.toLowerCase()], {}),
            ValidateObject(locale, {}),
        )
    }
    registerKey(key, value) { // ⚠ Will override existings keys
        if (!isString(key) || isEmpty(key)) throw new Error(`Class LocaleManager (RegisterKey): "key" must be a valid string.`);
        if (!isString(value) || isEmpty(value)) throw new Error(`Class LocaleManager (RegisterKey): "value" must be a valid string.`);
        
        this.#locales[this.#lang][key] = value;
    }
 
    getKeyValue(key, options) {
        const Search = (key, lang) => {
            if (!isString(lang) || isEmpty(lang)) return null; 

            // Check in specific lang
            if (KeyOf(lang, this.#locales)) {
                let value = this.#locales[lang][key];
                if (isDefined(value) && !isEmpty(value)) {
                    return value
                }
            }
            
            // Check in generic lang
            if (/^[a-z]{2,3}[_-][a-z]{2,3}$/i.test(lang)) {
                let genericLang = lang.split(/[_-]/gi)[0];
                
                if (KeyOf(genericLang, this.#locales)) {
                    let value = this.#locales[genericLang][key];
                    if (isDefined(value) && !isEmpty(value)) {
                        return value
                    }
                }
            }
            
            return null;
        }

        return Search(key, options.lang) ?? Search(key, this.#lang) ?? Search(key, this.#defaultLang) ?? null;
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
        
        return options.default ?? key;
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
        
        return options.default ?? key;
    }

    formatString(string, args = []) {
        if (typeof args === 'undefined' || args == null) return string;
        if (!Array.isArray(args)) args = [ args ];
        if (args.length === 0) return string;

        let index = -1;
        return string.replace(/\%([0-9]*)([asdifuxX])/g, (match, argindex, specifier) => {
            index++

            let value = args[argindex.length > 0 ? Number(argindex) : index];

            if (!isDefined(value)) return match;
    
            switch (specifier) {
                case 'a':  // Any
                    return value;
                
                case 's':  // String
                    return String(value);
                
                case 'd':  // Integer (signed)
                case 'i':
                    return parseInt(value);
                
                case 'f':  // Floating-point
                    return parseFloat(value).toFixed(2);  // Par défaut à 2 décimales, ajustable
                
                case 'u':  // Unsigned integer
                    return Math.abs(parseInt(value));
                
                case 'x':  // Hexadecimal lowercase
                    return parseInt(value).toString(16);
                
                case 'X':  // Hexadecimal uppercase
                    return parseInt(value).toString(16).toUpperCase();
                
                default:
                    return match; // Ne rien changer si le spécificateur n'est pas reconnu
            }
        });
    }
}

const Locale = new LocaleManager();

exports.Locale = Locale;
exports.LocaleManager = LocaleManager;