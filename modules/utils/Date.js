import { Registry } from '#modules/Registry';


// Convertit une string "1h30m" en secondes
export function strToSec(str = '') {
  const units = { h: 3600, m: 60, s: 1 };
  return str.match(/\d+[hms]/gi)?.reduce((acc, curr) => {
    const value = parseInt(curr);
    const unit = curr.slice(-1).toLowerCase();
    return acc + (value * (units[unit] || 0));
  }, 0) || 0;
}

// Convertit des ms en format "1d2h5m"
export function msToTime(ms) {
  if (ms <= 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${d ? d+'d' : ''}${h ? h+'h' : ''}${m ? m+'m' : ''}${s ? s+'s' : ''}`;
}

// Version longue et française de SecToStr
export function SecToStr(seconds) {
  if (seconds <= 0) return '0 seconde';

  const lang = {
    and: "et",
    units: [
      { label: ["an", "ans"], val: 31104000 }, // 360 jours comme ton original
      { label: ["mois", "mois"], val: 2592000 },
      { label: ["jour", "jours"], val: 86400 },
      { label: ["heure", "heures"], val: 3600 },
      { label: ["minute", "minutes"], val: 60 },
      { label: ["seconde", "secondes"], val: 1 }
    ]
  };

  let remaining = seconds;
  const parts = lang.units.reduce((acc, unit) => {
    const count = Math.floor(remaining / unit.val);
    if (count > 0) {
      remaining %= unit.val;
      acc.push(`${count} ${unit.label[count > 1 ? 1 : 0]}`);
    }
    return acc;
  }, []);

  if (parts.length === 0) return `0 ${lang.units[5].label[0]}`;
  if (parts.length === 1) return parts[0];
  
  const last = parts.pop();
  return `${parts.join(', ')} ${lang.and} ${last}`;
}

export const toDateTime = (secs) => new Date(secs * 1000);

// Retourne le timestamp actuel (par défaut en secondes)
Date.timestamp = function(divisor = 1000) {
  return Math.floor(Date.now() / Math.max(1, divisor));
};

// @deprecated Utilisez Date.timestamp()
Date.time = function() {
  console.warn('Date.time is deprecated, use Date.timestamp instead');
  return Date.timestamp();
};

const DateFunctions = {
  // @deprecated Utilisez Date.timestamp()
  getUnixTime: function() {
    console.warn('Date.getUnixTime is deprecated, use Date.timestamp instead');
    return Math.floor(this.getTime() / 1000);
  },
  getMaxDayOfMonth: function() {
    return new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
  },
  getDayOfYear: function() {
    const start = new Date(this.getFullYear(), 0, 0);
    const diff = this - start;
    const oneDay = 86400000;
    return Math.floor(diff / oneDay);
  },
  isValid: function() {
    return !isNaN(this.getTime());
  },
  getCurrentWeekDays: function() {
    const startOfWeek = new Date(this);
    const day = this.getDay();
    const diff = this.getDate() - day + (day === 0 ? -6 : 1); // Lundi comme premier jour
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d.toUTCString();
    });
  },
};


for (let key in DateFunctions) {
  Object.defineProperty(Object.prototype, key, {
    value: DateFunctions[key],
    enumerable: false,
    configurable: false,
    writable: true,
  });
}



const deprecated = [
  "Date.time",
  "Date.prototype.getUnixTime",
];
function markDeprecated(str) {
  if (deprecated.includes(str)) return `${str} \x1B[38;5;0m\x1B[48;5;208m(deprecated)\x1B[0m`;
  return str;
}

// MARK: Register Module
Registry.register({
  name: "Time Utils",
  group: "utils",
  version: "2.0",
  details: [
    "strToSec",
    "msToTime",
    "SecToStr",
    "toDateTime",
		"Date.timestamp",
		"Date.time",
    ...Object.keys(DateFunctions).map(s => `Date.prototype.${s}`),
	].map(s => markDeprecated(s)),
});