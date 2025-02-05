// ========================================================================== //
global.loadedModules.modules.push({
    name: "Cooldown",
    version: "4.0",
    details: [
        'module.purge',
        'module.Cooldown',
        'Cooldown.passed',
        'Cooldown.set',
        'Cooldown.reset',
        'Cooldown.list',
    ]
});
// ========================================================================== //

const _COOLDOWN = {};

function purge() {
	Object.keys(_COOLDOWN).forEach(name => {
		Object.keys(_COOLDOWN[name]).forEach(key => {
			if (Date.time() >= _COOLDOWN[name][key]) delete _COOLDOWN[name][key];
		});
		if (Object.keys(_COOLDOWN[name]).length === 0) delete _COOLDOWN[name];
	});
}
const purgeInterval = setInterval(purge, 5*60*1000);


class Cooldown {
  constructor({ name, id, value, timestamp } = {}) {
    if (typeof name === 'undefined') throw 'INVALID_COOLDOWN_NAME';
    if (typeof id === 'undefined') throw 'INVALID_COOLDOWN_ID';

    if (!Cooldown.cooldown[name]) Cooldown.cooldown[name] = {};
    if (!Cooldown.cooldown[name][id]) Cooldown.cooldown[name][id] = timestamp ?? Date.timestamp();

    this.name = name;
    this.id = id;
    this.value = value || (Cooldown.cooldown[name][id] - Date.timestamp());
    this.timestamp = Cooldown.cooldown[name][id];
  }

  static get cooldown() {
    return _COOLDOWN;
  }

  static exist(name, id) {
	if (!name) return false;
	if (!id) return typeof this._COOLDOWN[name] !== 'undefined';
	return typeof this._COOLDOWN[name][id] !== 'undefined';
  }

  passed() {
    return Date.timestamp() >= this.timestamp;
  }

  remain() {
    return Math.max(0, this.timestamp - Date.timestamp());
  }

  set(time = 0) {
    this.value = time;
    this.timestamp = Date.timestamp() + time;
    Cooldown.cooldown[this.name][this.id] = this.timestamp;
  }

  setTimestamp(value = Date.timestamp()) {
    if (value > Date.timestamp()) {
      this.timestamp = value;
      this.value = value - Date.timestamp();
    } else {
      this.timestamp = 0;
      this.value = 0;
    }
    Cooldown.cooldown[this.name][this.id] = this.timestamp;
  }

  reset() {
    this.value = 0;
    this.timestamp = 0;
    Cooldown.cooldown[this.name][this.id] = 0;
  }

  toJSON() {
    return {
      name: this.name,
      id: this.id,
      value: this.value,
      timestamp: this.timestamp,
    };
  }

  clone() {
    return new Cooldown(this.toJSON());
  }
}



module.exports = {
	purgeInterval: purgeInterval,
	purge: purge,
	Cooldown: Cooldown
};