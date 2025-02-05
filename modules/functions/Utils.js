// ========================================================================== //
if (typeof global.loadedModules !== 'undefined') {
    global.loadedModules.modules.push({
        name: "General Utils",
        version: "1.0",
        details: [
            "noop",
            "selfnoop",
            "Wait",
            "isBoolean",
            "isObject",
            "isArray",
            "isString",
            "isNumber",
            "isEmpty",
            "isNull",
            "isDefined",
            "KeyOf",
            "MD5",

            "ValidateBoolean",
            "ValidateObject",
            "ValidateArray",
            "ValidateString",
            "ValidateNumber",
            
            "getRandomRange",
            "getRandomRangeFloor",
            "getRandomRangeRound",


            "Array.prototype.unique",
            "Array.prototype.divide",
            "Array.prototype.chunkOf",
            "Array.prototype.toLowerCase",
            "Array.prototype.toUpperCase",
            "Array.prototype.simplify",
            "Array.prototype.fromLast",
            "Array.prototype.last",
            "Array.prototype.get",
            "Array.prototype.getRandomIndex",
            "Array.prototype.getRandomElement",
            "Array.prototype.outRandomElement",
            "Array.prototype.shuffle",
            "Array.prototype.promise",

            "Number.prototype.between",
            "Number.prototype.toAbbreviated",
            "Number.parseAbbreviatedNumber",

            "Object.merge",
            "Object.prototype.only",
            "Object.prototype.enties",
            "Object.prototype.keys",
            "Object.prototype.values",

            "String.prototype.between",
            "String.prototype.toAbbreviated",
            "String.prototype.simplify",
            "String.prototype.ucFirst",
            "String.prototype.similarity",
            "String.prototype.randomCase",
            "String.prototype.invertCase",

            "mapIteratorPrototype.array",
        ]
    });
}
// ========================================================================== //

// ===================================================================================================
//   __  __ ___ ___  ___ 
//  |  \/  |_ _/ __|/ __|
//  | |\/| || |\__ \ (__ 
//  |_|  |_|___|___/\___|
// ===================================================================================================

// #region Misc
exports.noop = function noop() {};
exports.selfnoop = function selfnoop() { return this; }

exports.Wait = function Wait(t) {
	return new Promise((r) => setTimeout(r, t));
}

exports.isBoolean = function isBoolean(o) {
    return typeof o == 'boolean';
}
exports.isObject = function isObject(o) {
    return typeof o == 'object' && !Array.isArray(o);
}
exports.isArray = function isArray(o) {
    return typeof o == 'object' && Array.isArray(o);
}
exports.isString = function isString(o) {
    return typeof o == 'string';
}
exports.isNumber = function isNumber(o) {
    return typeof o == 'number';
}

exports.isEmpty = function isEmpty(o) {
    return isString(o) || isArray(o) ? o.length == 0 : isObject(o) ? Object.keys(o).length == 0 : false;
}
exports.isNull = function isNull(o) {
    return o === null
};
exports.isDefined = function isDefined(o) {
    return typeof o !== 'undefined';
}

exports.KeyOf = function KeyOf(k,o) {
    return isObject(o) ? o.hasOwnProperty(k) : isArray(o) ? o.includes(k) : false;
}

exports.ValidateBoolean = function ValidateBoolean(o, d) {
    return isBoolean(o) ? o : d;
}
exports.ValidateObject = function ValidateObject(o, d) {
    return isObject(o)  ? o : d;
}
exports.ValidateArray = function ValidateArray(o, d) {
    return isArray(o)   ? o : d;
}
exports.ValidateString = function ValidateString(o, d) {
    return isString(o)  ? o : d;
}
exports.ValidateNumber = function ValidateNumber(o, d) {
    return isNumber(o)  ? o : d;
}
// #enregion

// ===================================================================================================
//   __  __   _ _____ _  _ 
//  |  \/  | /_\_   _| || |
//  | |\/| |/ _ \| | | __ |
//  |_|  |_/_/ \_\_| |_||_|
// ===================================================================================================
// #region Math
Math.clamp = function(v, min, max) {
    return Math.max(min ?? v, Math.min(v, max ?? v));
}

Math.between = function(min, current, max) {
    return Math.max(min, Math.min(current, max));
}

Math.calculate = function(rawcalc) {
	if (typeof rawcalc !== 'string') return null;
	
	while (rawcalc.match(/\(([^\(\)]*)\)/g)) {
		Array.from(new Set(rawcalc.match(/\(([^\(\)]*)\)/g))).forEach(m => {
			rawcalc = rawcalc.replace(m,calculate(m.slice(1,-1)))
		});
	}
	
	// --- Parse a calculation string into an array of numbers and operators
    var calculation = [],
        current = '';
    for (var i = 0, ch; ch = rawcalc.charAt(i); i++) {
        if ('^*/+-'.indexOf(ch) > -1) {
            if (current == '' && ch == '-') {
                current = '-';
            } else {
                calculation.push(parseFloat(current), ch);
                current = '';
            }
        } else {
            current += rawcalc.charAt(i);
        }
    }
    if (current != '') {
        calculation.push(parseFloat(current));
    }
	
    // --- Perform a calculation expressed as an array of operators and numbers
    var ops = [{'^': (a, b) => Math.pow(a, b)},
               {'*': (a, b) => a * b, '/': (a, b) => a / b},
               {'+': (a, b) => a + b, '-': (a, b) => a - b}],
        newCalc = [],
        currentOp;
    for (var i = 0; i < ops.length; i++) {
        for (var j = 0; j < calculation.length; j++) {
            if (ops[i][calculation[j]]) {
                currentOp = ops[i][calculation[j]];
            } else if (currentOp) {
                newCalc[newCalc.length - 1] = 
                    currentOp(newCalc[newCalc.length - 1], calculation[j]);
                currentOp = null;
            } else {
                newCalc.push(calculation[j]);
            }
            // console.llog(newCalc);
        }
        calculation = newCalc;
        newCalc = [];
    }
    if (calculation.length > 1) {
        // console.log('Error: unable to resolve calculation');
        return calculation;
    } else {
        return calculation[0];
    }
}
// #endregion

// ===================================================================================================
//     _   ___ ___    _ __   __
//    /_\ | _ \ _ \  /_\\ \ / /
//   / _ \|   /   / / _ \\ V / 
//  /_/ \_\_|_\_|_\/_/ \_\|_|  
// ===================================================================================================
// #region Array
const ArrayFunctions = {
    unique: function() {
        return Array.from(new Set(this));
    },
    chunkOf: function(size) {
        let arr = [];
        for (let i=0; i<this.length/size; i++) {
            arr.push( this.slice(i*size, (i+1)*size) );
        };
        
        return arr;
    },
    divide: function(parts) {
        if (parts <= 0) return this;
        
        const result = [];
        const partSize = Math.ceil(this.length / parts);
        
        for (let i = 0; i < this.length; i += partSize) {
            result.push(this.slice(i, i + partSize));
            parts--;
        }
        
        return result;
    },
    toLowerCase: function() {
        return this.map(v => typeof v === 'string' ? v.toLocaleLowerCase() : v);
    },
    toUpperCase: function() {
        return this.map(v => typeof v === 'string' ? v.toUpperCase() : v);
    },
    simplify: function() {
        return this.map(v => typeof v === 'string' ? v.simplify() : v);
    },
    fromLast: function(n=0) {
        return this[this.length - 1 - n];
    },
    last: function() {
        return this[this.length - 1];
    },
    get: function(index) {
        if (index < 0) return this[this.length + index];
        return this[index];
    },
    getRandomIndex: function () {
        return Math.floor(Math.random() * this.length);
    },
    getRandomElement: function () {
        return this[Math.floor(Math.random() * this.length)]
    },
    outRandomElement: function () {
        rdm = Math.floor(Math.random() * this.length);
        el = this[rdm]
        this.splice(rdm,1);
        return el;
    },
    shuffle: function() {
        for (let i = this.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
    },
    promise: function() {
        return Promise.all(this);
    },
};

const ArrayGetters = {
    lastIndex: function() {
        return this.findLastIndex(() => true);
    },
}

for (let key in ArrayFunctions) {
    Object.defineProperty(Array.prototype, key, {
        value: ArrayFunctions[key],
        enumerable: false, configurable: false, writable: false
    });
}

for (let key in ArrayGetters) {
    Object.defineProperty(Array.prototype, key, {
        get: ArrayGetters[key],
        enumerable: false, configurable: false
    });
}
// #endregion

// ===================================================================================================
//   _  _            _             
//  | \| |_  _ _ __ | |__  ___ _ _ 
//  | .` | || | '  \| '_ \/ -_) '_|
//  |_|\_|\_,_|_|_|_|_.__/\___|_|  
// ===================================================================================================
// #region Number
const NumberFunctions = {
    between: function(min, max, include = true) {
        if (include) return this >= min && this <= max;
        return this > min && this < max;
    },
    toAbbreviated(value) {
        let newValue = value;
        const suffixes = ["", "k", "m", "b","t","q","Qa","Sx","Sp"];
        let suffixNum = 0;
        while (newValue >= 1000) {
            newValue /= 1000;
            suffixNum++;
        }
    
        newValue = newValue.toPrecision(3);
    
        newValue += suffixes[suffixNum];
        return newValue;
    },

}

Number.parseAbbreviatedNumber = function(str='') {
	e = str.match(/qa/gi) || [];z = str.match(/sx/gi) || [];y = str.match(/sp/gi) || [];str = str.replace(/Qa|Sx|Sp/gi,'');k = str.match(/k/gi) || [];m = str.match(/m/gi) || [];g = str.match(/b/gi) || [];t = str.match(/t/gi) || [];p = str.match(/q/gi) || [];
	if (isNaN(Number(str.replace(/k|m|b|t|q/gi,''))) || str.replace(/[kmgtpezy]/gi,'') === '') return null;
	return Number(str.replace(/[^0-9.]/g,''))*Math.pow(1000,k.length)*Math.pow(1000000,m.length)*Math.pow(1000000000,g.length)*Math.pow(1000000000000,t.length)*Math.pow(1000000000000000,p.length)*Math.pow(1000000000000000000,e.length)*Math.pow(1000000000000000000000,z.length)*Math.pow(1000000000000000000000000,y.length);
}

for (let key in NumberFunctions) {
    Object.defineProperty(Number.prototype, key, {
        value: NumberFunctions[key],
        enumerable: false, configurable: false, writable: false
    });
}
// #endregion

// ===================================================================================================
//    ___  _     _        _   
//   / _ \| |__ (_)___ __| |_ 
//  | (_) | '_ \| / -_) _|  _|
//   \___/|_.__// \___\__|\__|
// ========== |__/ ===================================================================================
// #region Object
Object.merge = function merge(target, ...sources) {
    if (sources.length < 1) return target;
    
    for (let source of sources) {
        if (isObject(target) && isObject(source)) {
            for (const key in source) {
                if (isObject(source[key])) {
                    if (!target[key]) Object.assign(target, { [key]: {} });
                    merge(target[key], source[key]);
                } else {
                    Object.assign(target, { [key]: source[key] });
                }
            }
        }
    }
        
    return target;
}

const ObjectFunctions = {
    only: function() {
        let copy = {};
        for (let key of [...arguments].flat()) {
            copy[key] = this[key];
        }
        return copy;
    },
    entries: function() {
        return Object.entries(this);
    },
    keys: function() {
        return Object.keys(this);
    },
    values: function() {
        return Object.values(this);
    },
}

for (let key in ObjectFunctions) {
    Object.defineProperty(Object.prototype, key, {
        value: ObjectFunctions[key],
        enumerable: false, configurable: false, writable: true
    });
}
// #endregion


// ===================================================================================================
//   ___              _           
//  | _ \__ _ _ _  __| |___ _ __  
//  |   / _` | ' \/ _` / _ \ '  \ 
//  |_|_\__,_|_||_\__,_\___/_|_|_|
// ===================================================================================================
// #region Random

exports.getRandomRange = function getRandomRange(min,max) {
    return Math.random() * (max - min) + min;
}
exports.getRandomRangeFloor = function getRandomRangeFloor(min,max) {
    return Math.floor(Math.random() * (max - min) + min);
}
exports.getRandomRangeRound = function getRandomRangeRound(min,max) {
    return Math.round(Math.random() * (max - min) + min);
}
// #endregion

// ===================================================================================================
//   ___ _       _           
//  / __| |_ _ _(_)_ _  __ _ 
//  \__ \  _| '_| | ' \/ _` |
//  |___/\__|_| |_|_||_\__, |
// =================== |___/ ========================================================================= 
// #region Number
const StringFunctions = {
    between: function(min, max, include = true) {
        if (include) return this >= min && this <= max;
        return this > min && this < max;
    },
    toAbbreviated(value) {
        let newValue = value;
        const suffixes = ["", "k", "m", "b","t","q","Qa","Sx","Sp"];
        let suffixNum = 0;
        while (newValue >= 1000) {
            newValue /= 1000;
            suffixNum++;
        }
        
        newValue = newValue.toPrecision(3);
        
        newValue += suffixes[suffixNum];
        return newValue;
    },
    simplify: function() {
        let letters = {"À": "A", "Á": "A", "Â": "A", "Ã": "A", "Ä": "A", "Å": "A", "à": "a", "á": "a", "â": "a", "ã": "a", "ä": "a", "å": "a", "Ç": "C", "ç": "c", "È": "E", "É": "E", "Ê": "E", "Ë": "E", "è": "e", "é": "e", "ê": "e", "ë": "e", "Ì": "I", "Í": "I", "Î": "I", "Ï": "I", "ì": "i", "í": "i", "î": "i", "ï": "i", "Ñ": "N", "ñ": "n", "Ò": "O", "Ó": "O", "Ô": "O", "Õ": "O", "Ö": "O", "Ø": "O", "ò": "o", "ó": "o", "ô": "o", "õ": "o", "ö": "o", "ø": "o", "ß": "s", "Ù": "U", "Ú": "U", "Û": "U", "Ü": "U", "ù": "u", "ú": "u", "û": "u", "ü": "u", "Ÿ": "Y", "ÿ": "y", "Æ": "AE", "æ": "ae", "Œ": "OE", "œ": "oe"}
        return this.replace(/[À-ÏÑ-ÖØ-Üß-åæ-ïñ-öø-üÿŒœŸ]/g, letter => letters[letter])
    },
    ucFirst: function(){
        return this.substring(0,1).toUpperCase()+this.substring(1);
    },
    similarity: function(s1, s2) {
        function editDistance(s1, s2) {
            s1 = s1.toLowerCase();
            s2 = s2.toLowerCase();
          
            let costs = new Array();
            for (let i = 0; i <= s1.length; i++) {
                let lastValue = i;
              for (let j = 0; j <= s2.length; j++) {
                if (i == 0) {
                    costs[j] = j;
                } else {
                  if (j > 0) {
                    let newValue = costs[j - 1];

                    if (s1.charAt(i - 1) != s2.charAt(j - 1)) {
                      newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }

                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                  }
                }
              }
              if (i > 0) {
                costs[s2.length] = lastValue;
              }
            }

            return costs[s2.length];
        }

        let longer = s1;
        let shorter = s2;
        if (s1.length < s2.length) {
          longer = s2;
          shorter = s1;
        }

        let longerLength = longer.length;
        if (longerLength == 0) {
          return 1.0;
        }
        return (longerLength - editDistance(longer, shorter)) / parseFloat(longerLength);
    },
    randomCase: function(p=0.5) {
        if (p > 1) p = 1;
        if (p < 1) p = 0;

        return this.split('').map(s => {
            if (Math.random() >= (1 - p)) {
                return s.toUpperCase();
            } else return s.toLowerCase();
        }).join('');
    },
    invertCase: function() {
        return this.split('').map(s => {
            if (s.toLowerCase() === s) {
                return s.toUpperCase();
            } else return s.toLowerCase();
        }).join('');
    },
}

String.ReverseCoolFont = function(text) {
    let zalgo = "̶̴̵̷̸̡̧̨̢̛͚̩̲̫̘̪̥̠͍̼̞͙̙͈̳̟̤̮͔̯̺̱̬̜͖͉̹̣̖͕̗̦͎̝̰̭̻͇͓̋̽͛̇͐̐̿́̉̀͊͑͋̈́̍̔͌̆̏͗̃̊̎̑̀̅͒̄̓̾̓̒͆́͂̌̈̂̚͘̕͜͝͠ͅ";
    let charmap = {"𝔞":"A","𝔟":"B","𝔠":"C","𝔡":"d","𝔢":"E","𝔣":"F","𝔤":"G","𝔥":"H","𝔦":"I","𝔧":"j","𝔨":"k","𝔩":"L","𝔪":"M","𝔫":"n","𝔬":"o","𝔭":"p","𝔮":"Q","𝔯":"r","𝔰":"S","𝔱":"t","𝔲":"U","𝔳":"V","𝔴":"w","𝔵":"X","𝔶":"Y","𝔷":"Z","𝔄":"A","𝔅":"B","ℭ":"C","𝔇":"D","𝔈":"E","𝔉":"F","𝔊":"G","ℌ":"H","ℑ":"I","𝔍":"J","𝔎":"K","𝔏":"L","𝔐":"M","𝔑":"N","𝔒":"O","𝔓":"P","𝔔":"Q","ℜ":"R","𝔖":"S","𝔗":"T","𝔘":"U","𝔙":"V","𝔚":"W","𝔛":"X","𝔜":"Y","ℨ":"Z","𝖆":"a","𝖇":"b","𝖈":"c","𝖉":"d","𝖊":"e","𝖋":"f","𝖌":"g","𝖍":"h","𝖎":"i","𝖏":"j","𝖐":"k","𝖑":"l","𝖒":"m","𝖓":"n","𝖔":"o","𝖕":"p","𝖖":"q","𝖗":"r","𝖘":"s","𝖙":"t","𝖚":"u","𝖛":"v","𝖜":"w","𝖝":"x","𝖞":"y","𝖟":"z","𝕬":"A","𝕭":"B","𝕮":"C","𝕯":"D","𝕰":"E","𝕱":"F","𝕲":"G","𝕳":"H","𝕴":"I","𝕵":"J","𝕶":"K","𝕷":"L","𝕸":"M","𝕹":"N","𝕺":"O","𝕻":"P","𝕼":"Q","𝕽":"R","𝕾":"S","𝕿":"T","𝖀":"U","𝖁":"V","𝖂":"W","𝖃":"X","𝖄":"Y","𝖅":"Z","Ⓐ":"a","в":"B","Ć":"c","ᵉ":"E","𝐟":"f","𝕙":"h","ᶤ":"i","𝓙":"J","к":"K","ᗰ":"M","𝐧":"n","𝓞":"O","ⓟ":"P","𝐐":"q","𝓻":"R","ⓢ":"s","𝓽":"T","Ｕ":"u","ᐯ":"V","ω":"W","¥":"y","𝔃":"z","𝕒":"a","𝓫":"B","Ⓒ":"C","𝐃":"d","ⓔ":"e","ℱ":"F","Ｈ":"H","𝓲":"i","𝕁":"J","𝓀":"k","Ĺ":"L","𝓜":"M","ℕ":"N","Ø":"o","𝐪":"Q","ｒ":"R","𝓈":"s","ù":"U","𝐯":"v","𝐖":"w","ˣ":"x","ㄚ":"Y","Ž":"z","０":"0","➀":"1","２":"2","❸":"3","４":"4","❺":"5","➅":"6","７":"7","❽":"8","９":"9","𝓪":"a","𝓬":"c","𝓭":"D","𝓮":"e","𝓯":"f","𝓰":"G","𝓱":"h","𝓳":"j","𝓴":"k","𝓵":"l","𝓶":"M","𝓷":"n","𝓸":"o","𝓹":"P","𝓺":"q","𝓼":"s","𝓾":"u","𝓿":"v","𝔀":"w","𝔁":"X","𝔂":"y","𝓐":"A","𝓑":"b","𝓒":"C","𝓓":"D","𝓔":"e","𝓕":"F","𝓖":"G","𝓗":"h","𝓘":"i","𝓚":"k","𝓛":"L","𝓝":"n","𝓟":"P","𝓠":"q","𝓡":"r","𝓢":"s","𝓣":"T","𝓤":"u","𝓥":"V","𝓦":"W","𝓧":"x","𝓨":"Y","𝓩":"Z","𝒶":"a","𝒷":"b","𝒸":"c","𝒹":"d","𝑒":"e","𝒻":"f","𝑔":"g","𝒽":"h","𝒾":"i","𝒿":"j","𝓁":"l","𝓂":"m","𝓃":"n","𝑜":"o","𝓅":"p","𝓆":"q","𝓇":"r","𝓉":"t","𝓊":"u","𝓋":"v","𝓌":"w","𝓍":"x","𝓎":"y","𝓏":"z","𝒜":"A","𝐵":"B","𝒞":"C","𝒟":"D","𝐸":"E","𝐹":"F","𝒢":"G","𝐻":"H","𝐼":"I","𝒥":"J","𝒦":"K","𝐿":"L","𝑀":"M","𝒩":"N","𝒪":"O","𝒫":"P","𝒬":"Q","𝑅":"R","𝒮":"S","𝒯":"T","𝒰":"U","𝒱":"V","𝒲":"W","𝒳":"X","𝒴":"Y","𝒵":"Z","𝟢":"0","𝟣":"1","𝟤":"2","𝟥":"3","𝟦":"4","𝟧":"5","𝟨":"6","𝟩":"7","𝟪":"8","𝟫":"9","𝕓":"B","𝕔":"C","𝕕":"d","𝕖":"E","𝕗":"f","𝕘":"g","𝕚":"i","𝕛":"J","𝕜":"K","𝕝":"L","𝕞":"m","𝕟":"n","𝕠":"o","𝕡":"P","𝕢":"Q","𝕣":"R","𝕤":"S","𝕥":"T","𝕦":"U","𝕧":"v","𝕨":"W","𝕩":"X","𝕪":"y","𝕫":"Z","𝔸":"a","𝔹":"B","ℂ":"c","𝔻":"D","𝔼":"E","𝔽":"f","𝔾":"G","ℍ":"h","𝕀":"i","𝕂":"K","𝕃":"L","𝕄":"M","𝕆":"o","ℙ":"P","ℚ":"q","ℝ":"r","𝕊":"S","𝕋":"T","𝕌":"U","𝕍":"V","𝕎":"W","𝕏":"X","𝕐":"y","ℤ":"Z","𝟘":"0","𝟙":"1","𝟚":"2","𝟛":"3","𝟜":"4","𝟝":"5","𝟞":"6","𝟟":"7","𝟠":"8","𝟡":"9","ａ":"a","ｂ":"b","ｃ":"c","ｄ":"D","ｅ":"E","ｆ":"f","ｇ":"G","ｈ":"h","ｉ":"i","ｊ":"J","ｋ":"k","ｌ":"L","ｍ":"M","ｎ":"n","ｏ":"O","ｐ":"p","ｑ":"Q","ｓ":"S","ｔ":"T","ｕ":"U","ｖ":"V","ｗ":"w","ｘ":"X","ｙ":"Y","ｚ":"z","Ａ":"A","Ｂ":"b","Ｃ":"C","Ｄ":"D","Ｅ":"E","Ｆ":"f","Ｇ":"g","Ｉ":"i","Ｊ":"j","Ｋ":"k","Ｌ":"l","Ｍ":"m","Ｎ":"N","Ｏ":"O","Ｐ":"P","Ｑ":"q","Ｒ":"r","Ｓ":"s","Ｔ":"t","Ｖ":"V","Ｗ":"w","Ｘ":"x","Ｙ":"Y","Ｚ":"Z","１":"1","３":"3","５":"5","６":"6","８":"8","ꪖ":"A","᥇":"B","ᥴ":"C","ᦔ":"D","ꫀ":"E","ᠻ":"F","ᧁ":"G","ꫝ":"H","꠸":"I","꠹":"J","ᛕ":"k","ꪶ":"L","ꪑ":"M","ꪀ":"N","ꪮ":"O","ρ":"P","ꪇ":"Q","᥅":"R","ᦓ":"S","ꪻ":"T","ꪊ":"U","ꪜ":"V","᭙":"W","᥊":"X","ꪗ":"Y","ƺ":"Z","ᦲ":"0","᧒":"1","ᒿ":"2","ᗱ":"1","ᔰ":"4","Ƽ":"5","ᦆ":"6","ᒣ":"7","Ზ":"8","ၦ":"9","❁":"O","😍":"0","ᴀ":"A","ʙ":"B","ᴄ":"C","ᴅ":"D","ᴇ":"E","ꜰ":"F","ɢ":"G","ʜ":"H","ɪ":"I","ᴊ":"J","ᴋ":"K","ʟ":"L","ᴍ":"M","ɴ":"N","ᴏ":"O","ᴘ":"P","ʀ":"R","ꜱ":"S","ᴛ":"T","ᴜ":"U","ᴠ":"V","ᴡ":"W","ʏ":"Y","ᴢ":"Z","ɐ":"a","ɔ":"c","ǝ":"e","ɟ":"f","ɓ":"g","ɥ":"h","ı":"I","ɾ":"r","ʞ":"k","ɯ":"w","ɹ":"r","ʇ":"t","ʌ":"v","ʍ":"m","ʎ":"y","∀":"A","ᙠ":"B","Ɔ":"C","ᗡ":"D","Ǝ":"E","Ⅎ":"F","⅁":"G","ſ":"J","⋊":"K","˥":"L","Ԁ":"P","Ό":"Q","ᴚ":"R","⊥":"T","∩":"U","Λ":"A","⅄":"Y","⇂":"1","ᄅ":"2","Ɛ":"E","ㄣ":"4","ގ":"5","ㄥ":"l","🄰":"A","🄱":"B","🄲":"C","🄳":"D","🄴":"E","🄵":"F","🄶":"G","🄷":"H","🄸":"I","🄹":"J","🄺":"K","🄻":"L","🄼":"M","🄽":"N","🄾":"O","🄿":"P","🅀":"Q","🅁":"R","🅂":"S","🅃":"T","🅄":"U","🅅":"V","🅆":"W","🅇":"X","🅈":"Y","🅉":"Z","🅰":"A","🅱":"B","🅲":"C","🅳":"D","🅴":"E","🅵":"F","🅶":"G","🅷":"H","🅸":"I","🅹":"J","🅺":"K","🅻":"L","🅼":"M","🅽":"N","🅾":"O","🅿":"P","🆀":"Q","🆁":"R","🆂":"S","🆃":"T","🆄":"U","🆅":"V","🆆":"W","🆇":"X","🆈":"Y","🆉":"Z","ₐ":"A","ₑ":"E","ₕ":"H","ᵢ":"I","ⱼ":"J","ₖ":"K","ₗ":"L","ₘ":"M","ₙ":"N","ₒ":"O","ₚ":"P","ᵣ":"R","ₛ":"S","ₜ":"T","ᵤ":"U","ᵥ":"V","ₓ":"X","₀":"0","₁":"1","₂":"2","₃":"3","₄":"4","₅":"5","₆":"6","₇":"7","₈":"8","₉":"9","ᵃ":"A","ᵇ":"B","ᶜ":"c","ᵈ":"d","ᶠ":"F","ᵍ":"g","ʰ":"h","ⁱ":"i","ʲ":"J","ᵏ":"k","ˡ":"l","ᵐ":"M","ⁿ":"n","ᵒ":"O","ᵖ":"p","ʳ":"r","ˢ":"S","ᵗ":"T","ᵘ":"U","ᵛ":"v","ʷ":"w","ʸ":"Y","ᶻ":"z","ᴬ":"A","ᴮ":"B","ᴰ":"D","ᴱ":"E","ᴳ":"G","ᴴ":"H","ᴵ":"I","ᴶ":"J","ᴷ":"K","ᴸ":"L","ᴹ":"M","ᴺ":"N","ᴼ":"O","ᴾ":"P","ᴿ":"R","ᵀ":"T","ᵁ":"U","ⱽ":"V","ᵂ":"W","⁰":"0","¹":"1","²":"2","³":"3","⁴":"4","⁵":"5","⁶":"6","⁷":"7","⁸":"8","⁹":"9","ⓐ":"A","ⓑ":"B","ⓒ":"C","ⓓ":"D","ⓕ":"f","ⓖ":"g","ⓗ":"H","ⓘ":"I","ⓙ":"j","ⓚ":"K","ⓛ":"l","ⓜ":"m","ⓝ":"n","ⓞ":"o","ⓠ":"q","ⓡ":"R","ⓣ":"t","ⓤ":"u","ⓥ":"V","ⓦ":"W","ⓧ":"x","ⓨ":"y","ⓩ":"Z","Ⓑ":"B","Ⓓ":"d","Ⓔ":"e","Ⓕ":"f","Ⓖ":"g","Ⓗ":"H","Ⓘ":"I","Ⓙ":"J","Ⓚ":"k","Ⓛ":"L","Ⓜ":"M","Ⓝ":"N","Ⓞ":"O","Ⓟ":"p","Ⓠ":"Q","Ⓡ":"R","Ⓢ":"s","Ⓣ":"T","Ⓤ":"U","Ⓥ":"V","Ⓦ":"w","Ⓧ":"x","Ⓨ":"Y","Ⓩ":"z","⓪":"0","①":"1","②":"2","③":"3","④":"4","⑤":"5","⑥":"6","⑦":"7","⑧":"8","⑨":"9","ค":"A","๒":"B","ς":"C","๔":"D","є":"E","Ŧ":"t","ﻮ":"G","ђ":"H","เ":"I","ן":"J","ɭ":"L","๓":"M","ภ":"N","๏":"O","ק":"P","ợ":"Q","г":"r","ร":"s","Շ":"T","ย":"u","ש":"V","ฬ":"W","א":"X","ץ":"y","չ":"Z","α":"A","Ⴆ":"b","ƈ":"C","ԃ":"d","ҽ":"e","ϝ":"f","ɠ":"G","ԋ":"h","ι":"I","ʝ":"j","ƙ":"K","ʅ":"l","ɱ":"M","ɳ":"n","σ":"o","ϙ":"q","ʂ":"s","ƚ":"t","υ":"U","ʋ":"V","ყ":"Y","ȥ":"z","ǟ":"A","ɮ":"B","ɖ":"D","ɛ":"E","ʄ":"F","ɦ":"H","ɨ":"I","ӄ":"K","ռ":"N","օ":"o","ք":"p","զ":"q","ֆ":"S","ȶ":"T","ʊ":"U","ա":"w","Ӽ":"X","ʐ":"Z","Ꮧ":"A","Ᏸ":"B","ፈ":"C","Ꮄ":"D","Ꮛ":"E","Ꭶ":"F","Ꮆ":"G","Ꮒ":"H","Ꭵ":"I","Ꮰ":"J","Ꮶ":"K","Ꮭ":"L","Ꮇ":"M","Ꮑ":"N","Ꭷ":"O","Ꭾ":"P","Ꭴ":"Q","Ꮢ":"R","Ꮥ":"S","Ꮦ":"T","Ꮼ":"U","Ꮙ":"V","Ꮗ":"W","ጀ":"X","Ꭹ":"Y","ፚ":"Z","ą":"a","ც":"B","ɧ":"H","Ɩ":"L","ŋ":"N","ơ":"O","℘":"P","ཞ":"R","ɬ":"T","ų":"U","۷":"V","ῳ":"W","ҳ":"X","ʑ":"Z","๖":"B","¢":"C","໓":"D","ē":"E","ງ":"G","ว":"J","ຖ":"N","໐":"O","๑":"Q","Ş":"s","น":"U","ง":"V","ຟ":"W","ฯ":"Y","ຊ":"Z","𝐚":"A","𝐛":"b","𝐜":"C","𝐝":"D","𝐞":"e","𝐠":"g","𝐡":"h","𝐢":"i","𝐣":"j","𝐤":"K","𝐥":"l","𝐦":"m","𝐨":"o","𝐩":"P","𝐫":"r","𝐬":"S","𝐭":"T","𝐮":"u","𝐰":"w","𝐱":"x","𝐲":"y","𝐳":"Z","𝐀":"a","𝐁":"B","𝐂":"C","𝐄":"E","𝐅":"F","𝐆":"g","𝐇":"H","𝐈":"I","𝐉":"J","𝐊":"k","𝐋":"L","𝐌":"M","𝐍":"N","𝐎":"o","𝐏":"P","𝐑":"R","𝐒":"S","𝐓":"t","𝐔":"u","𝐕":"v","𝐗":"x","𝐘":"Y","𝐙":"z","𝟎":"0","𝟏":"1","𝟐":"2","𝟑":"3","𝟒":"4","𝟓":"5","𝟔":"6","𝟕":"7","𝟖":"8","𝟗":"9","𝗮":"a","𝗯":"b","𝗰":"c","𝗱":"d","𝗲":"e","𝗳":"f","𝗴":"g","𝗵":"h","𝗶":"i","𝗷":"j","𝗸":"k","𝗹":"l","𝗺":"m","𝗻":"n","𝗼":"o","𝗽":"p","𝗾":"q","𝗿":"r","𝘀":"s","𝘁":"t","𝘂":"u","𝘃":"v","𝘄":"w","𝘅":"x","𝘆":"y","𝘇":"z","𝗔":"A","𝗕":"B","𝗖":"C","𝗗":"D","𝗘":"E","𝗙":"F","𝗚":"G","𝗛":"H","𝗜":"I","𝗝":"J","𝗞":"K","𝗟":"L","𝗠":"M","𝗡":"N","𝗢":"O","𝗣":"P","𝗤":"Q","𝗥":"R","𝗦":"S","𝗧":"T","𝗨":"U","𝗩":"V","𝗪":"W","𝗫":"X","𝗬":"Y","𝗭":"Z","𝟬":"0","𝟭":"1","𝟮":"2","𝟯":"3","𝟰":"4","𝟱":"5","𝟲":"6","𝟳":"7","𝟴":"8","𝟵":"9","𝘢":"a","𝘣":"b","𝘤":"c","𝘥":"d","𝘦":"e","𝘧":"f","𝘨":"g","𝘩":"h","𝘪":"i","𝘫":"j","𝘬":"k","𝘭":"l","𝘮":"m","𝘯":"n","𝘰":"o","𝘱":"p","𝘲":"q","𝘳":"r","𝘴":"s","𝘵":"t","𝘶":"u","𝘷":"v","𝘸":"w","𝘹":"x","𝘺":"y","𝘻":"z","𝘈":"A","𝘉":"B","𝘊":"C","𝘋":"D","𝘌":"E","𝘍":"F","𝘎":"G","𝘏":"H","𝘐":"I","𝘑":"J","𝘒":"K","𝘓":"L","𝘔":"M","𝘕":"N","𝘖":"O","𝘗":"P","𝘘":"Q","𝘙":"R","𝘚":"S","𝘛":"T","𝘜":"U","𝘝":"V","𝘞":"W","𝘟":"X","𝘠":"Y","𝘡":"Z","𝙖":"a","𝙗":"b","𝙘":"c","𝙙":"d","𝙚":"e","𝙛":"f","𝙜":"g","𝙝":"h","𝙞":"i","𝙟":"j","𝙠":"k","𝙡":"l","𝙢":"m","𝙣":"n","𝙤":"o","𝙥":"p","𝙦":"q","𝙧":"r","𝙨":"s","𝙩":"t","𝙪":"u","𝙫":"v","𝙬":"w","𝙭":"x","𝙮":"y","𝙯":"z","𝘼":"A","𝘽":"B","𝘾":"C","𝘿":"D","𝙀":"E","𝙁":"F","𝙂":"G","𝙃":"H","𝙄":"I","𝙅":"J","𝙆":"K","𝙇":"L","𝙈":"M","𝙉":"N","𝙊":"O","𝙋":"P","𝙌":"Q","𝙍":"R","𝙎":"S","𝙏":"T","𝙐":"U","𝙑":"V","𝙒":"W","𝙓":"X","𝙔":"Y","𝙕":"Z","𝚊":"a","𝚋":"b","𝚌":"c","𝚍":"d","𝚎":"e","𝚏":"f","𝚐":"g","𝚑":"h","𝚒":"i","𝚓":"j","𝚔":"k","𝚕":"l","𝚖":"m","𝚗":"n","𝚘":"o","𝚙":"p","𝚚":"q","𝚛":"r","𝚜":"s","𝚝":"t","𝚞":"u","𝚟":"v","𝚠":"w","𝚡":"x","𝚢":"y","𝚣":"z","𝙰":"A","𝙱":"B","𝙲":"C","𝙳":"D","𝙴":"E","𝙵":"F","𝙶":"G","𝙷":"H","𝙸":"I","𝙹":"J","𝙺":"K","𝙻":"L","𝙼":"M","𝙽":"N","𝙾":"O","𝙿":"P","𝚀":"Q","𝚁":"R","𝚂":"S","𝚃":"T","𝚄":"U","𝚅":"V","𝚆":"W","𝚇":"X","𝚈":"Y","𝚉":"Z","𝟶":"0","𝟷":"1","𝟸":"2","𝟹":"3","𝟺":"4","𝟻":"5","𝟼":"6","𝟽":"7","𝟾":"8","𝟿":"9","ᄃ":"C","Σ":"E","Ή":"H","ᄂ":"L","П":"N","Ө":"O","Я":"R","Ƨ":"S","Ƭ":"T","Ц":"U","Щ":"W","∂":"d","ƒ":"F","н":"h","נ":"j","ℓ":"L","м":"M","η":"N","я":"R","ѕ":"S","т":"t","ν":"v","χ":"X","у":"Y","å":"a","ß":"B","Ð":"D","ê":"e","£":"F","ï":"i","ñ":"N","ð":"o","þ":"P","§":"S","†":"T","µ":"u","Ä":"A","Ç":"C","È":"E","Ì":"I","Ö":"O","Ú":"U","×":"x","₳":"A","฿":"B","₵":"C","Đ":"d","Ɇ":"E","₣":"F","₲":"G","Ⱨ":"H","ł":"I","₭":"K","Ⱡ":"L","₥":"M","₦":"N","₱":"P","Ɽ":"R","₴":"S","₮":"T","Ʉ":"U","₩":"W","Ӿ":"X","Ɏ":"Y","Ⱬ":"Z","卂":"A","乃":"B","匚":"C","ᗪ":"d","乇":"E","千":"F","卄":"H","丨":"i","ﾌ":"J","Ҝ":"k","爪":"m","几":"n","ㄖ":"O","卩":"P","Ɋ":"Q","尺":"R","丂":"s","ㄒ":"T","ㄩ":"U","山":"w","乂":"X","乙":"Z","ﾑ":"A","り":"D","ｷ":"F","ム":"G","ん":"H","ﾉ":"I","ズ":"K","ﾚ":"L","ﾶ":"M","刀":"N","の":"O","ｱ":"P","ゐ":"Q","ｲ":"T","ひ":"U","√":"V","ﾒ":"X","ﾘ":"Y","♢":"O","９】":"9","ҍ":"b","ç":"c","ժ":"d","ց":"g","հ":"h","ì":"i","ҟ":"k","Ӏ":"l","ղ":"n","է":"t","մ":"u","ѵ":"v","վ":"y","Հ":"z","Ⱥ":"A","β":"b","↻":"C","Ꭰ":"D","Ƒ":"F","Ɠ":"G","Ƕ":"H","į":"I","ل":"J","Ҡ":"K","Ꝉ":"L","Ɱ":"M","ហ":"N","ට":"O","φ":"P","Ҩ":"Q","འ":"R","Ϛ":"S","Ͳ":"T","Ա":"U","Ỽ":"V","చ":"W","ჯ":"X","Ӌ":"Y","ɀ":"Z","⊘":"0","ϩ":"2","Ӡ":"3","५":"4","Ϭ":"6","९":"9","ᗩ":"A","ᗷ":"b","ᑕ":"c","ᖴ":"F","ᕼ":"H","ᒍ":"J","ᒪ":"l","ᑎ":"N","ᑭ":"P","ᑫ":"Q","ᖇ":"r","ᔕ":"S","ᑌ":"u","ᗯ":"W","᙭":"x","ᘔ":"Z","ᑢ":"D","ᕲ":"E","ᘿ":"F","ᘜ":"H","ᓰ":"J","ᒚ":"K","ᖽ":"L","ᐸ":"M","ᘻ":"O","ᘉ":"P","ᓍ":"Q","ᕵ":"R","ᕴ":"S","ᖶ":"V","ᑘ":"W","ᐺ":"X","ᘺ":"Y","ᖻ":"0","a̶":"a","b̶":"b","c̶":"c","d̶":"d","e̶":"e","f̶":"f","g̶":"g","h̶":"h","i̶":"i","j̶":"j","k̶":"k","l̶":"l","m̶":"m","n̶":"n","o̶":"o","p̶":"p","q̶":"q","r̶":"r","s̶":"s","t̶":"t","u̶":"u","v̶":"v","w̶":"w","x̶":"x","y̶":"y","z̶":"z","A̶":"A","B̶":"B","C̶":"C","D̶":"D","E̶":"E","F̶":"F","G̶":"G","H̶":"H","I̶":"I","J̶":"J","K̶":"K","L̶":"L","M̶":"M","N̶":"N","O̶":"O","P̶":"P","Q̶":"Q","R̶":"R","S̶":"S","T̶":"T","U̶":"U","V̶":"V","W̶":"W","X̶":"X","Y̶":"Y","Z̶":"Z","0̶":"0","1̶":"1","2̶":"2","3̶":"3","4̶":"4","5̶":"5","6̶":"6","7̶":"7","8̶":"8","9̶":"9","a̴":"a","b̴":"b","c̴":"c","d̴":"d","e̴":"e","f̴":"f","g̴":"g","h̴":"h","i̴":"i","j̴":"j","k̴":"k","l̴":"l","m̴":"m","n̴":"n","o̴":"o","p̴":"p","q̴":"q","r̴":"r","s̴":"s","t̴":"t","u̴":"u","v̴":"v","w̴":"w","x̴":"x","y̴":"y","z̴":"z","A̴":"A","B̴":"B","C̴":"C","D̴":"D","E̴":"E","F̴":"F","G̴":"G","H̴":"H","I̴":"I","J̴":"J","K̴":"K","L̴":"L","M̴":"M","N̴":"N","O̴":"O","P̴":"P","Q̴":"Q","R̴":"R","S̴":"S","T̴":"T","U̴":"U","V̴":"V","W̴":"W","X̴":"X","Y̴":"Y","Z̴":"Z","0̴":"0","1̴":"1","2̴":"2","3̴":"3","4̴":"4","5̴":"5","6̴":"6","7̴":"7","8̴":"8","9̴":"9","a̷":"a","b̷":"b","c̷":"c","d̷":"d","e̷":"e","f̷":"f","g̷":"g","h̷":"h","i̷":"i","j̷":"j","k̷":"k","l̷":"l","m̷":"m","n̷":"n","o̷":"o","p̷":"p","q̷":"q","r̷":"r","s̷":"s","t̷":"t","u̷":"u","v̷":"v","w̷":"w","x̷":"x","y̷":"y","z̷":"z","A̷":"A","B̷":"B","C̷":"C","D̷":"D","E̷":"E","F̷":"F","G̷":"G","H̷":"H","I̷":"I","J̷":"J","K̷":"K","L̷":"L","M̷":"M","N̷":"N","O̷":"O","P̷":"P","Q̷":"Q","R̷":"R","S̷":"S","T̷":"T","U̷":"U","V̷":"V","W̷":"W","X̷":"X","Y̷":"Y","Z̷":"Z","0̷":"0","1̷":"1","2̷":"2","3̷":"3","4̷":"4","5̷":"5","6̷":"6","7̷":"7","8̷":"8","9̷":"9","a̲":"a","b̲":"b","c̲":"c","d̲":"d","e̲":"e","f̲":"f","g̲":"g","h̲":"h","i̲":"i","j̲":"j","k̲":"k","l̲":"l","m̲":"m","n̲":"n","o̲":"o","p̲":"p","q̲":"q","r̲":"r","s̲":"s","t̲":"t","u̲":"u","v̲":"v","w̲":"w","x̲":"x","y̲":"y","z̲":"z","A̲":"A","B̲":"B","C̲":"C","D̲":"D","E̲":"E","F̲":"F","G̲":"G","H̲":"H","I̲":"I","J̲":"J","K̲":"K","L̲":"L","M̲":"M","N̲":"N","O̲":"O","P̲":"P","Q̲":"Q","R̲":"R","S̲":"S","T̲":"T","U̲":"U","V̲":"V","W̲":"W","X̲":"X","Y̲":"Y","Z̲":"Z","0̲":"0","1̲":"1","2̲":"2","3̲":"3","4̲":"4","5̲":"5","6̲":"6","7̲":"7","8̲":"8","9̲":"9","a̳":"a","b̳":"b","c̳":"c","d̳":"d","e̳":"e","f̳":"f","g̳":"g","h̳":"h","i̳":"i","j̳":"j","k̳":"k","l̳":"l","m̳":"m","n̳":"n","o̳":"o","p̳":"p","q̳":"q","r̳":"r","s̳":"s","t̳":"t","u̳":"u","v̳":"v","w̳":"w","x̳":"x","y̳":"y","z̳":"z","A̳":"A","B̳":"B","C̳":"C","D̳":"D","E̳":"E","F̳":"F","G̳":"G","H̳":"H","I̳":"I","J̳":"J","K̳":"K","L̳":"L","M̳":"M","N̳":"N","O̳":"O","P̳":"P","Q̳":"Q","R̳":"R","S̳":"S","T̳":"T","U̳":"U","V̳":"V","W̳":"W","X̳":"X","Y̳":"Y","Z̳":"Z","0̳":"0","1̳":"1","2̳":"2","3̳":"3","4̳":"4","5̳":"5","6̳":"6","7̳":"7","8̳":"8","9̳":"9","a̾":"a","b̾":"b","c̾":"c","d̾":"d","e̾":"e","f̾":"f","g̾":"g","h̾":"h","i̾":"i","j̾":"j","k̾":"k","l̾":"l","m̾":"m","n̾":"n","o̾":"o","p̾":"p","q̾":"q","r̾":"r","s̾":"s","t̾":"t","u̾":"u","v̾":"v","w̾":"w","x̾":"x","y̾":"y","z̾":"z","A̾":"A","B̾":"B","C̾":"C","D̾":"D","E̾":"E","F̾":"F","G̾":"G","H̾":"H","I̾":"I","J̾":"J","K̾":"K","L̾":"L","M̾":"M","N̾":"N","O̾":"O","P̾":"P","Q̾":"Q","R̾":"R","S̾":"S","T̾":"T","U̾":"U","V̾":"V","W̾":"W","X̾":"X","Y̾":"Y","Z̾":"Z","0̾":"0","1̾":"1","2̾":"2","3̾":"3","4̾":"4","5̾":"5","6̾":"6","7̾":"7","8̾":"8","9̾":"9","a͎":"a","b͎":"b","c͎":"c","d͎":"d","e͎":"e","f͎":"f","g͎":"g","h͎":"h","i͎":"i","j͎":"j","k͎":"k","l͎":"l","m͎":"m","n͎":"n","o͎":"o","p͎":"p","q͎":"q","r͎":"r","s͎":"s","t͎":"t","u͎":"u","v͎":"v","w͎":"w","x͎":"x","y͎":"y","z͎":"z","A͎":"A","B͎":"B","C͎":"C","D͎":"D","E͎":"E","F͎":"F","G͎":"G","H͎":"H","I͎":"I","J͎":"J","K͎":"K","L͎":"L","M͎":"M","N͎":"N","O͎":"O","P͎":"P","Q͎":"Q","R͎":"R","S͎":"S","T͎":"T","U͎":"U","V͎":"V","W͎":"W","X͎":"X","Y͎":"Y","Z͎":"Z","0͎":"0","1͎":"1","2͎":"2","3͎":"3","4͎":"4","5͎":"5","6͎":"6","7͎":"7","8͎":"8","9͎":"9","a͓̽":"a","b͓̽":"b","c͓̽":"c","d͓̽":"d","e͓̽":"e","f͓̽":"f","g͓̽":"g","h͓̽":"h","i͓̽":"i","j͓̽":"j","k͓̽":"k","l͓̽":"l","m͓̽":"m","n͓̽":"n","o͓̽":"o","p͓̽":"p","q͓̽":"q","r͓̽":"r","s͓̽":"s","t͓̽":"t","u͓̽":"u","v͓̽":"v","w͓̽":"w","x͓̽":"x","y͓̽":"y","z͓̽":"z","A͓̽":"A","B͓̽":"B","C͓̽":"C","D͓̽":"D","E͓̽":"E","F͓̽":"F","G͓̽":"G","H͓̽":"H","I͓̽":"I","J͓̽":"J","K͓̽":"K","L͓̽":"L","M͓̽":"M","N͓̽":"N","O͓̽":"O","P͓̽":"P","Q͓̽":"Q","R͓̽":"R","S͓̽":"S","T͓̽":"T","U͓̽":"U","V͓̽":"V","W͓̽":"W","X͓̽":"X","Y͓̽":"Y","Z͓̽":"Z","0͓̽":"0","1͓̽":"1","2͓̽":"2","3͓̽":"3","4͓̽":"4","5͓̽":"5","6͓̽":"6","7͓̽":"7","8͓̽":"8","9͓̽":"9","♋︎":"a","♌︎":"b","♍︎":"c","♎︎":"d","♏︎":"e","♐︎":"f","♑︎":"g","♒︎":"h","♓︎":"i","🙰":"j","🙵":"k","●︎":"l","❍︎":"m","■︎":"n","□︎":"o","◻︎":"p","❑︎":"q","❒︎":"r","⬧︎":"s","⧫︎":"t","◆︎":"u","❖︎":"v","⬥︎":"w","⌧︎":"x","⍓︎":"y","⌘︎":"z","✌︎":"A","👌︎":"B","👍︎":"C","👎︎":"D","☜︎":"E","☞︎":"F","☝︎":"G","☟︎":"H","✋︎":"I","☺︎":"J","😐︎":"K","☹︎":"L","💣︎":"M","☠︎":"N","⚐︎":"O","🏱︎":"P","✈︎":"Q","☼︎":"R","💧︎":"S","❄︎":"T","🕆︎":"U","✞︎":"V","🕈︎":"W","✠︎":"X","✡︎":"Y","☪︎":"Z","📁︎":"0","📂︎":"1","📄︎":"2","🗏︎":"3","🗐︎":"4","🗄︎":"5","⌛︎":"6","🖮︎":"7","🖰︎":"8","🖲︎":"9","Δ":"A","Ĥ":"H","Ɨ":"i","Ќ":"k","ŕ":"R","Ŵ":"W","έ":"e","Ż":"Z","➁":"2","❹":"4","➆":"7","đ":"D","ᗴ":"e","ģ":"g","Ѷ":"v","ί":"I","Ĵ":"J","Ѳ":"0","Ǥ":"g","Ƥ":"p","Ǫ":"q","ş":"s","ţ":"T","Ğ":"G","❷":"2","➄":"5","➈":"9","丅":"T","❶":"1","➂":"3","➃":"4","❻":"6","Ň":"N","Ŝ":"s","Ў":"y","➇":"8","❾":"9","𝒆":"e","ķ":"K","Ж":"x","ώ":"w","ᶰ":"N","ᗝ":"o","❼":"7","ή":"n","ε":"e","Ř":"r","Ď":"d","Ħ":"H","ᒎ":"J","ϻ":"m","ž":"Z","Ť":"T","ч":"y","ʘ":"0","ħ":"h","ј":"j","Ł":"L","Μ":"m","Ǘ":"u","Ω":"q","ό":"O","Ữ":"U","Ƶ":"z","ά":"a","Ẹ":"e","ү":"y","Č":"c","Ã":"a","℃":"c","ғ":"F"};
    
    return text?.match(/./gu).map(c => {
        return zalgo.includes(c) ? '' : charmap[c] ?? c;
    }).join('');
}

for (let key in StringFunctions) {
    Object.defineProperty(String.prototype, key, {
        value: StringFunctions[key],
        enumerable: false, configurable: false, writable: false
    });
}
// #endregion


// ===================================================================================================
//   __  __           
//  |  \/  |__ _ _ __ 
//  | |\/| / _` | '_ \
//  |_|  |_\__,_| .__/
// ============ |_| ==================================================================================
// #region Map

const MapFunctions = {
    rename: function(key, new_key) {
        if (typeof this.get(new_key) !== 'undefined') throw new Error(`Can't rename key : '${new_key}' already exist`);
        if (this.get(key) === 'undefined') throw new Error(`Can't rename key : '${key}' doesn't exist`);
        this.set(new_key, this.get(key));
        this.delete(key);
    
        return this;
    },
    copy: function(key, new_key) {
        if (!this.get(key)) throw new Error(`Can't copy key : '${key}' doesn't exist`);
        this.set(new_key, this.get(key));
        
        return this;
    },
    clone: function() {
        let output = new Map();
    
        for (let key of this.keys()) {
            output.set(key, output.get(key));
        }
    
        return output;
    },
    forEachKeys: function(callback) {
        let elements = Array.from(this.keys()).map(k => this.get(k));
    
        Array.from(this.keys()).forEach((key, index, keys) => {
            callback.call(this, key, this.get(key), index, keys, elements, this);
        });
    },
}

const mapIteratorPrototype = Object.getPrototypeOf((new Map()).keys());

Object.defineProperty(mapIteratorPrototype, 'array', {
    value: function() {
        return Array.from(this);
    },
    enumerable: false, configurable: false, writable: false
});
// #endregion



exports.MD5 = function(d){var r = M(V(Y(X(d),8*d.length)));return r.toLowerCase()};function M(d){for(var _,m="0123456789ABCDEF",f="",r=0;r<d.length;r++)_=d.charCodeAt(r),f+=m.charAt(_>>>4&15)+m.charAt(15&_);return f}function X(d){for(var _=Array(d.length>>2),m=0;m<_.length;m++)_[m]=0;for(m=0;m<8*d.length;m+=8)_[m>>5]|=(255&d.charCodeAt(m/8))<<m%32;return _}function V(d){for(var _="",m=0;m<32*d.length;m+=8)_+=String.fromCharCode(d[m>>5]>>>m%32&255);return _}function Y(d,_){d[_>>5]|=128<<_%32,d[14+(_+64>>>9<<4)]=_;for(var m=1732584193,f=-271733879,r=-1732584194,i=271733878,n=0;n<d.length;n+=16){var h=m,t=f,g=r,e=i;f=md5_ii(f=md5_ii(f=md5_ii(f=md5_ii(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_hh(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_gg(f=md5_ff(f=md5_ff(f=md5_ff(f=md5_ff(f,r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+0],7,-680876936),f,r,d[n+1],12,-389564586),m,f,d[n+2],17,606105819),i,m,d[n+3],22,-1044525330),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+4],7,-176418897),f,r,d[n+5],12,1200080426),m,f,d[n+6],17,-1473231341),i,m,d[n+7],22,-45705983),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+8],7,1770035416),f,r,d[n+9],12,-1958414417),m,f,d[n+10],17,-42063),i,m,d[n+11],22,-1990404162),r=md5_ff(r,i=md5_ff(i,m=md5_ff(m,f,r,i,d[n+12],7,1804603682),f,r,d[n+13],12,-40341101),m,f,d[n+14],17,-1502002290),i,m,d[n+15],22,1236535329),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+1],5,-165796510),f,r,d[n+6],9,-1069501632),m,f,d[n+11],14,643717713),i,m,d[n+0],20,-373897302),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+5],5,-701558691),f,r,d[n+10],9,38016083),m,f,d[n+15],14,-660478335),i,m,d[n+4],20,-405537848),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+9],5,568446438),f,r,d[n+14],9,-1019803690),m,f,d[n+3],14,-187363961),i,m,d[n+8],20,1163531501),r=md5_gg(r,i=md5_gg(i,m=md5_gg(m,f,r,i,d[n+13],5,-1444681467),f,r,d[n+2],9,-51403784),m,f,d[n+7],14,1735328473),i,m,d[n+12],20,-1926607734),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+5],4,-378558),f,r,d[n+8],11,-2022574463),m,f,d[n+11],16,1839030562),i,m,d[n+14],23,-35309556),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+1],4,-1530992060),f,r,d[n+4],11,1272893353),m,f,d[n+7],16,-155497632),i,m,d[n+10],23,-1094730640),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+13],4,681279174),f,r,d[n+0],11,-358537222),m,f,d[n+3],16,-722521979),i,m,d[n+6],23,76029189),r=md5_hh(r,i=md5_hh(i,m=md5_hh(m,f,r,i,d[n+9],4,-640364487),f,r,d[n+12],11,-421815835),m,f,d[n+15],16,530742520),i,m,d[n+2],23,-995338651),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+0],6,-198630844),f,r,d[n+7],10,1126891415),m,f,d[n+14],15,-1416354905),i,m,d[n+5],21,-57434055),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+12],6,1700485571),f,r,d[n+3],10,-1894986606),m,f,d[n+10],15,-1051523),i,m,d[n+1],21,-2054922799),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+8],6,1873313359),f,r,d[n+15],10,-30611744),m,f,d[n+6],15,-1560198380),i,m,d[n+13],21,1309151649),r=md5_ii(r,i=md5_ii(i,m=md5_ii(m,f,r,i,d[n+4],6,-145523070),f,r,d[n+11],10,-1120210379),m,f,d[n+2],15,718787259),i,m,d[n+9],21,-343485551),m=safe_add(m,h),f=safe_add(f,t),r=safe_add(r,g),i=safe_add(i,e)}return Array(m,f,r,i)}function md5_cmn(d,_,m,f,r,i){return safe_add(bit_rol(safe_add(safe_add(_,d),safe_add(f,i)),r),m)}function md5_ff(d,_,m,f,r,i,n){return md5_cmn(_&m|~_&f,d,_,r,i,n)}function md5_gg(d,_,m,f,r,i,n){return md5_cmn(_&f|m&~f,d,_,r,i,n)}function md5_hh(d,_,m,f,r,i,n){return md5_cmn(_^m^f,d,_,r,i,n)}function md5_ii(d,_,m,f,r,i,n){return md5_cmn(m^(_|~f),d,_,r,i,n)}function safe_add(d,_){var m=(65535&d)+(65535&_);return(d>>16)+(_>>16)+(m>>16)<<16|65535&m}function bit_rol(d,_){return d<<_|d>>>32-_}

