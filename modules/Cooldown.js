// ========================================================================== //
global.loadedModules.modules.push({
    name: "Cooldown",
    version: "3.2",
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
	Object.keys(_COOLDOWN).forEach(cldwn => {
		Object.keys(_COOLDOWN[cldwn]).forEach(key => {
			if (Date.time() >= _COOLDOWN[cldwn][key]) delete _COOLDOWN[cldwn][key];
		});
		if (Object.keys(_COOLDOWN[cldwn]).length === 0) delete _COOLDOWN[cldwn];
	});
}
const purgeInterval = setInterval(purge, 5*60*1000);


class Cooldown {
	cldwn;id;value;
	constructor(cldwn,id){
		if (typeof id === 'undefined') {throw 'INVALID_COOLDOWN_ID';}
		
		if (!Cooldown.cooldown[cldwn]) Cooldown.cooldown[cldwn] = {};
		if (!Cooldown.cooldown[cldwn][id]) Cooldown.cooldown[cldwn][id] = Date.time();
		
		this.cldwn = cldwn;
		this.id = id;
		this.value =  Cooldown.cooldown[cldwn][id] - Date.time();
		this.timestamp = Cooldown.cooldown[cldwn][id];
	}
	static get cooldown() {return _COOLDOWN;}
	
	passed() {
		return this.value < 1;
	}
	
	set(time=0) {
		this.value = time;
		this.timestamp = Date.time() + time;
		Cooldown.cooldown[this.cldwn][this.id] = this.timestamp; 
	}

	reset() {
		this.value = 0;
		this.timestamp = Date.time();
		Cooldown.cooldown[this.cldwn][this.id] = 0;
	}

	list() {
		return _COOLDOWN;
	};
}


module.exports = {
	purgeInterval: purgeInterval,
	purge: purge,
	Cooldown: Cooldown
};