// ========================================================================== //
const _MODULENAME = "Functions Loader";
const _MODULVER = "3.2";
// ========================================================================== //

const consoleModule = require('../config').consoleModule || true;
const client = require('../app');
const fs = require('fs');

global.loadedModules = {
    events:[],
	modules:[{name:_MODULENAME,version:_MODULVER}]
};


function displaythings(array) {
	const sortByName = function(a, b) {
		if (a.name < b.name) return -1;
		if (a.name > b.name) return 1;
		return 0;
	};
	
	array.sort(sortByName).flatMap((object,index,list) => {
		if (index === list.length-1) {
			if (object.details) {
				return [
					' |-+- ' + `${object.name} version ${object.version}`,
					...object.details.map((detail, di, dl) => (di === dl.length - 1 ? ' \\ \\--- ' : ' \\ |--- ')+ detail),
					' |',
				];
			} else {
				return ' \\--- ' + `${object.name} version ${object.version}`;
			}
		} else {
			if (object.details) {
				return [
					' |-+- ' + `${object.name} version ${object.version}`,
					...object.details.map((detail, di, dl) => (di === dl.length - 1 ? ' | \\--- ' : ' | |--- ')+ detail),
					' |',
				];
			} else {
				return ' |--- ' + `${object.name} version ${object.version}`;
			}
		}
	}).forEach((o) => console.llog(o));
}

global.ModuleLoaderList = () => {
	// ================================================================================
	// Afficher les modules chargés
	console.llog(" # === "+ loadedModules.events.length +" Events chargés :\n |");
	displaythings(loadedModules.events);
	// ================================================================================

	console.blank();
	
	// ================================================================================
	// Afficher les Modules chargés
	console.llog(" # === "+ loadedModules.modules.length +" modules chargés :\n |");
	displaythings(loadedModules.modules);
	// ================================================================================

	console.blank(2);
}

// Load all functions in global scope.
fs.readdirSync("./modules/functions").filter(filename => filename.endsWith(".js")).forEach((func) => {
	let loadedModule = require(`./functions/${func}`);
	Object.keys(loadedModule).forEach(exportedElementId => global[exportedElementId] = loadedModule[exportedElementId]);
});

// Better Console
if (consoleModule) {
	require('./console.js');
} else {
	console.llog = console.log; 
	console.debug = () => {};
	console.blank = () => {};
}

// BDD Manager
global.Manager = new (require('./MongoDb/Manager'));

global.DiscordMenu = require('./DiscordMenu.js');

const { Locale } = require('./Locales.js')
global.Locale = Locale;

// Emotes
global.Emotes = require('../assets/Emotes');

global.UnicodeEmotes = require('../assets/UnicodeEmotes');

// ShortUniqueId
global.ShortUniqueId = require('./ShortUniqueId');