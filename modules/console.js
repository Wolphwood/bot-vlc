// ========================================================================== //
global.loadedModules.modules.push({
    name: "Upgraded Console",
    version: "3.1"
});
// ========================================================================== //

const util = require('util');
const fs = require('fs');

console.CONSOLE_DEBUG = require('../config').debug;
const oLog = console.log;
const oWarn = console.warn;
const oInfo = console.info;
const oError = console.error;

function writeit() {
	let date = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
	
	if (!fs.existsSync('./logs/')) {
		fs.mkdirSync('./logs/');
	}

	fs.appendFileSync(`./logs/${date}.log`, [...arguments].join(', ') + '\n');
}

console.llog = function() {
	writeit.apply(this, arguments);
	oLog.apply(this, arguments);
}
console.warn = function() {
	writeit.apply(this, ['[WARN]', ...arguments]);
	oWarn.apply(this, ['\x1B[38;5;0m\x1B[48;5;208m[ WARN ]\x1B[0m', ...arguments]);
}
console.info = function() {
	writeit.apply(this, ['[INFO]', ...arguments]);
	oInfo.apply(this, [`\x1B[38;5;0m\x1B[48;5;27m[ INFO ]\x1B[0m`, ...arguments]);
}
console.error = function() {
	oWarn.apply(this, ['\x1B[38;5;0m\x1B[48;5;196m[ ERROR ]\x1B[0m', ...arguments]);
	oError.apply(this, arguments);
}

console.log = function() {
	today = new Date();y = today.getFullYear();mm = (today.getMonth() >= 10 ? today.getMonth()+1 : "0"+(today.getMonth()+1));dd = (today.getDay() >= 10 ? today.getDay() : "0"+today.getDay());hrs = (today.getHours() >= 10 ? today.getHours() : "0"+today.getHours());min = (today.getMinutes() >= 10 ? today.getMinutes() : "0"+today.getMinutes());sec = (today.getSeconds() >= 10 ? today.getSeconds() : "0"+today.getSeconds());
	console.llog.apply(this,[`[${dd}-${mm}-${y} ${hrs}:${min}:${sec}]`,...arguments]);
}
console.blank = (n) => {
	oLog(Array.from(Array(n||1),() => '\n').join(''))
}
console.debug = function() {
	if (!console.CONSOLE_DEBUG) return;

	console.log.apply(this,['[ DEBUG ]',...arguments]);
}
console.inspect = function() {
	let keys = Object.keys(arguments);

	if (arguments.length > 1) {
		let farg = keys.shift();
		console.log.apply(this, [util.inspect(arguments[farg], {showHidden: false, depth: null, colors: true})]);

		keys.forEach(key => {
			let argument = arguments[key];
			console.llog.apply(this, [util.inspect(argument, {showHidden: false, depth: null, colors: true})]);
		});
	} else {
		console.log.apply(this, [util.inspect(arguments[keys[0]], {showHidden: false, depth: null, colors: true})]);
	}
}
module.exports = console;