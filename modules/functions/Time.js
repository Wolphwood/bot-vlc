// ========================================================================== //
global.loadedModules.modules.push({
    name: "Time Functions",
    version: "1.0",
	details: [
		"Date.getUnixTime",
		"Date.now",
		"Date.time",
		"strToSec",
		"msToTime",
		"toDateTime",
		"secToStr",
		"Date.getMaxDayOfMonth",
		"Date.getCurrentWeekDays",
		"Date.getDayOfYear",
		"Date.isValid",
	]
});
// ========================================================================== //

// Sleep
exports.Sleep = function(time=1000) {
	return new Promise((r) => setTimeout(() => r(), time));
}

// [ Unix Time system ]
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }

function strToSec(str='') {
    return str.match(/[0-9]+[A-z]/g)?.reduce((a, b) => a + Number(b.replace(/[A-z]/g,'')) * (
        RegExp('[0-9]+h','gi').test(b) * 3600
        || RegExp('[0-9]+m','gi').test(b) * 60
        || RegExp('[0-9]+s','gi').test(b)
    ), 0);
}
exports.strToSec = strToSec;

function msToTime(ms){
	days = Math.floor(ms / 86400000); // 24*60*60*1000
	daysms = ms % 86400000; // 24*60*60*1000
	hours = Math.floor(daysms / 3600000); // 60*60*1000
	hoursms = ms % 3600000; // 60*60*1000
	minutes = Math.floor(hoursms / 60000); // 60*1000
	minutesms = ms % 60000; // 60*1000
	sec = Math.floor(minutesms / 1000);

	let str = "";
	if (days) str = str + days + "d";
	if (hours) str = str + hours + "h";
	if (minutes) str = str + minutes + "m";
	if (sec) str = str + sec + "s";

	return str;
}
exports.msToTime = msToTime;



function toDateTime(secs) {
    var t = new Date(1970, 0, 1); // Epoch
    t.setSeconds(secs);
    return t;
}
exports.toDateTime = toDateTime;

function SecToStr(time) {
	if (time < 0) time = 0;
	
	Lang = {
		format:"YMDHmS",
		and:"et",
		year:	{ s:"ans",		p:"ans"		 },
		month:	{ s:"mois",		p:"mois"	 },
		day:	{ s:"jour",		p:"jours"	 },
		hour:	{ s:"heure",	p:"heures"	 },
		minute:	{ s:"minute",	p:"minutes"	 },
		second:	{ s:"seconde",	p:"secondes" },
	}
	
	let y = Math.floor(time/(86400*360));
	let m = Math.floor((time-(y*86400*360))/(86400*30));
	let d = Math.floor((time-(y*86400*360)-(m*86400*30))/86400);
	let h = Math.floor((time-(y*86400*360)-(m*86400*30)-(d*86400))/3600);
	let mn = Math.floor((time-(y*86400*360)-(m*86400*30)-(h*3600)-(d*86400))/60);
	let s = time-(y*86400*360)-(m*86400*30)-(d*86400)-(h*3600)-(mn*60);
	
	let arr = Lang.format.split('').map(elem => {
		if(elem==='Y') return(y>0?y+' '+Lang.year[(y<2?'s':'p')]:null);
		if(elem==='M') return(m>0?m+' '+Lang.month[(m<2?'s':'p')]:null);
		if(elem==='D') return(d>0?d+' '+Lang.day[(d<2?'s':'p')]:null);
		if(elem==='H') return(h>0?h+' '+Lang.hour[(h<2?'s':'p')]:null);
		if(elem==='m') return(mn>0?mn+' '+Lang.minute[(mn<2?'s':'p')]:null);
		if(elem==='S') return(s>0?s+' '+Lang.second[(s<2?'s':'p')]:null);
		return null;
	}).filter(e => e !== null);
	
	if (arr.length > 1) {
		let last = arr.pop();
		return arr.join(', ')+' '+Lang.and+' '+last;
	} else if (arr.length > 0) {
		return arr[0];
	} else return '0 '+Lang.second.s;
}
exports.SecToStr = SecToStr;


Date.prototype.getMaxDayOfMonth = function() {
	return new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
}

Date.prototype.getCurrentWeekDays = function() {
	var day = new Date(this.setDate(this.getDate() - (this.getDay()-1))).getDayOfYear();
	
	
    return [
		new Date(this.getFullYear(),0,day+0).toUTCString(),
		new Date(this.getFullYear(),0,day+1).toUTCString(),
		new Date(this.getFullYear(),0,day+2).toUTCString(),
		new Date(this.getFullYear(),0,day+3).toUTCString(),
		new Date(this.getFullYear(),0,day+4).toUTCString(),
		new Date(this.getFullYear(),0,day+5).toUTCString(),
		new Date(this.getFullYear(),0,day+6).toUTCString(),
	];
}


Date.prototype.getDayOfYear = function() {
    var start = new Date(this.getFullYear(), 0, 0);
    var diff = this - start;
    var oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}



Date.prototype.isValid = function () { 
	return this.getTime() === this.getTime(); 
}; 