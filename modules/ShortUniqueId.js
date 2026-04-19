export default class ShortUniqueId {
  constructor({dictionary, shuffle, debug, length, checkCollision, uuids} = {}) {
    this.version = "1.1.0";
    this.dictionaryIndex = 0;
    this.dictionaryRange = [];
    this.lowerBound = 0;
    this.upperBound = 0;
    this.dictionaryLength = 0;

    this.uuids = uuids ?? [];

    this._digit_first_ascii = 48;
    this._digit_last_ascii = 58;
    this._alpha_lower_first_ascii = 97;
    this._alpha_lower_last_ascii = 123;
    this._hex_last_ascii = 103;
    this._alpha_upper_first_ascii = 65;
    this._alpha_upper_last_ascii = 91;
    
    this.dictAliases = {
      num: "number",
      alphanumeric: "alphanum",
      lower: "alpha_lower",
      lowernum: "alphanum_lower",
      alphanumeric_lower: "alphanum_lower",
      alphanumeric_lowercase: "alphanum_lower",
      lownum: "alphanum_lower",
      upper: "alpha_upper",
      uppernum: "alphanum_upper",
      alphanumeric_upper: "alphanum_upper",
      alphanumeric_uppercase: "alphanum_upper",
      upnum: "alphanum_upper",
      hexa: "hex",
      hexadecimal: "hex",
    };

    this.dicts = {
      _number_dict_ranges: {
        digits: [this._digit_first_ascii, this._digit_last_ascii],
      },
      _alpha_dict_ranges: {
        lowerCase: [
          this._alpha_lower_first_ascii,
          this._alpha_lower_last_ascii,
        ],
        upperCase: [
          this._alpha_upper_first_ascii,
          this._alpha_upper_last_ascii,
        ],
      },
      _alpha_lower_dict_ranges: {
        lowerCase: [
          this._alpha_lower_first_ascii,
          this._alpha_lower_last_ascii,
        ],
      },
      _alpha_upper_dict_ranges: {
        upperCase: [
          this._alpha_upper_first_ascii,
          this._alpha_upper_last_ascii,
        ],
      },
      _alphanum_dict_ranges: {
        digits: [this._digit_first_ascii, this._digit_last_ascii],
        lowerCase: [
          this._alpha_lower_first_ascii,
          this._alpha_lower_last_ascii,
        ],
        upperCase: [
          this._alpha_upper_first_ascii,
          this._alpha_upper_last_ascii,
        ],
      },
      _alphanum_lower_dict_ranges: {
        digits: [this._digit_first_ascii, this._digit_last_ascii],
        lowerCase: [
          this._alpha_lower_first_ascii,
          this._alpha_lower_last_ascii,
        ],
      },
      _alphanum_upper_dict_ranges: {
        digits: [this._digit_first_ascii, this._digit_last_ascii],
        upperCase: [
          this._alpha_upper_first_ascii,
          this._alpha_upper_last_ascii,
        ],
      },
      _hex_dict_ranges: {
        decDigits: [this._digit_first_ascii, this._digit_last_ascii],
        alphaDigits: [this._alpha_lower_first_ascii, this._hex_last_ascii],
      },
    }

    this.setDictionary(dictionary ?? 'alphanum', shuffle ?? true);
    this.debug = debug ?? false;
    this.uuidLength = length ?? 6;
    this.checkCollision = checkCollision ?? false; 
  }

  log(...args) {
    args[0] = `[short-unique-id] ${args[0]}`;
    if (this.debug) {
      if (typeof console !== 'undefined' && console !== null) {
        if (typeof console.debug !== "undefined") {
          console.debug.call(this, args);
        } else {
          console.log.call(this, args);
        }
      }
    }
  }

  getDictionaries() {
    return [
      ...Object.keys(this.dicts).map(dictName => dictName.slice(1,-12)),
      ...Object.keys(this.dictAliases),
    ];
  }

  setDictionary(dictionary, shuffle) {
    let charArray; // Variable de stockage de l'objet dictionnaire
    
    if (dictionary && Array.isArray(dictionary) && dictionary.length > 1) { // Si l'objet dictionnaire est valide
      charArray = dictionary; // Utilisez l'objet dictionnaire tel quel
    } else { // Sinon
      charArray = []; // Créez un nouvel objet dictionnaire vide
      
      this.currentDictionaryIndex = 0;
      let dictRangeList = this.dicts[`_${dictionary}_dict_ranges`]; // Récupère la liste des plages de l'objet dictionnaire actuel

      if (!dictRangeList) dictRangeList = this.dicts[`_${this.dictAliases[dictionary]}_dict_ranges`];

      if (!dictRangeList) throw new Error(`Unknow dictionnary '${dictionary}'`);
      
      Object.keys(dictRangeList).forEach((rangeKey) => { // Pour chaque plage de l'objet dictionnaire
        this.dictionaryRange = dictRangeList[rangeKey];
        let [lower, upper] = [this.dictionaryRange[0], this.dictionaryRange[1]].sort((a,b) => a - b);

        for (let i = lower; i < upper; i++) {
          charArray.push(String.fromCharCode(i)); // Ajoutez chaque caractère de la plage à l'objet dictionnaire
        }
      });
    }

    if (shuffle) { // Si le deuxième paramètre est vrai
      charArray = charArray.sort(() => Math.random() > 0.5); // Mélangez l'objet dictionnaire
    }

    this.dictionary = charArray; // Stockez l'objet dictionnaire
    this.dictionaryLength = this.dictionary.length; // Stockez la longueur de l'objet dictionnaire
    this.counter = 0; // Réinitialisez le compteur
  }

  
  sequentialUUID() {
    let t = this.counter;
    let i = 0;
    let e = "";
    do {
      i = t % this.dictionaryLength;
      t = Math.trunc(t / this.dictionaryLength);
      e += this.dictionary[i];
    } while (t !== 0);
    return (this.counter += 1), e;
  };
  seq = this.sequentialUUID;

  
  randomUUID(length = this.uuidLength || DEFAULT_UUID_LENGTH) {
    if (length === null || typeof length === "undefined" || length < 1) {
      throw new Error("Invalid UUID Length Provided");
    }
    
    let uuid = "";
    for (let i = 0; i < length; i++) {
      let randomIndex = parseInt((Math.random() * this.dictionaryLength).toFixed(0), 10) % this.dictionaryLength;
      uuid += this.dictionary[randomIndex];
    }
    
    if (this.checkCollision) {
      if (uuid in this.uuids) {
        let numberAvailables = this.availableUUIDs();

        if (this.uuids.length >= numberAvailables) {
          throw new Error(`Limit of ${numberAvailables} uids reached`);
        }
        uuid = this.randomUUID(length);
      }
    }

    this.uuids.push(uuid);
    return uuid;
  }
  random = this.randomUUID;
  

  availableUUIDs(len = this.uuidLength) {
    return parseFloat(Math.pow([...new Set(this.dictionary)].length, len).toFixed(0));
  }

  approxMaxBeforeCollision(len = this.availableUUIDs(this.uuidLength)) {
    return parseFloat(Math.sqrt((Math.PI / 2) * len).toFixed(20));
  }

  collisionProbability(availables = this.availableUUIDs(this.uuidLength), len = this.uuidLength) {
    return parseFloat(
      (this.approxMaxBeforeCollision(availables) / this.availableUUIDs(len)).toFixed(20)
    );
  }

  uniqueness (availables = this.availableUUIDs(this.uuidLength)) {
    let i = parseFloat(
      (1 - this.approxMaxBeforeCollision(availables) / availables).toFixed(20)
    );
    
    return i > 1 ? 1 : i < 0 ? 0 : i;
  };

  getVersion() {
    return this.version;
  }

  stamp(finalLength) {
    if (typeof finalLength !== "number" || finalLength < 10) {
      throw new Error("Param finalLength must be number greater than 10");
    }
    
    // Obtenir la date en tant que nombre hexadécimal sur 8 octets
    let timestamp = Math.floor(+new Date() / 1000).toString(16);
    
    // Calculer la longueur de la chaîne aléatoire pour obtenir la longueur finale souhaitée
    let randomLength = finalLength - 9;
    let maxRandomLength = (randomLength > 15) ? 15 : randomLength;
    let randomIndex = Math.round(Math.random() * maxRandomLength);
    
    // Générer une chaîne aléatoire
    let randomString = this.randomUUID(randomLength);
    
    // Créer le timbre en concaténant la chaîne aléatoire, le timestamp et la longueur de la chaîne aléatoire
    let stamp = `${randomString.substr(0, randomIndex)}${timestamp}${randomString.substr(randomIndex)}${randomIndex.toString(16)}`;
    
    return stamp;
  }
    
  parseStamp(stamp) {
    if (stamp.length < 10) {
      throw new Error("Stamp length invalid");
    }
    
    // Obtenir la longueur de la chaîne aléatoire
    let randomLength = parseInt(stamp.substr(stamp.length - 1, 1), 16);
    
    // Obtenir le timestamp hexadécimal de 8 octets à partir de la chaîne aléatoire
    let timestampHex = stamp.substr(randomLength, 8);
    
    // Convertir le timestamp hexadécimal en timestamp UNIX en secondes
    let timestamp = parseInt(timestampHex, 16) * 1000;
    
    return new Date(timestamp);
  }
}