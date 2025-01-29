// ========================================================================== //
global.loadedModules.modules.push({
    name: "Upgraded Console",
    version: "3.0"
});
// ========================================================================== //

const util = require('util');

console.CONSOLE_DEBUG = require('../config').debug;
const oLog = console.log;

console.llog = oLog;
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