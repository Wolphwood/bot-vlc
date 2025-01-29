// ========================================================================== //
global.loadedModules.modules.push({
    name: "UID Generator",
    version: "1.2",
	details: [
		"CreateUID",
	]
});
// ========================================================================== //

const CHARLIST = {
	all:[],
	lowernumber:[],
	uppernumber:[],
	lower:['a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'],
	upper:['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'],
	number:['0','1','2','3','4','5','6','7','8','9']
};
Object.keys(CHARLIST).slice(3).forEach(charset => CHARLIST[charset].forEach(c => CHARLIST.all.push(c)));
['lower','number'].forEach(charset => CHARLIST[charset].forEach(c => CHARLIST.lowernumber.push(c)));
['upper','number'].forEach(charset => CHARLIST[charset].forEach(c => CHARLIST.uppernumber.push(c)));


function CreateUID(existingUIDS=[], o) {
	console.warn(`CreateUID is deprecated, use 'ShortUniqueId instead.'`);

	let option = Object.assign({size:4,type:'all'}, o || {});
	
	if (!Object.keys(CHARLIST).includes(option.type)) throw new Error('INVALID_UID_CHARSET');
	if (typeof option.size !== 'number') throw new Error('UID_SIZE_MUST_BE_A_NUMBER');
	if (option.size < 1) throw new Error('INVALID_UID_SIZE_TOO_SMALL');
	
	let uid;
	while (!uid || existingUIDS.includes(uid)) {
		uid = Array.from(Array(option.size), () => CHARLIST[option.type].getRandomElement()).join('');
	}

	return uid;
}
exports.CreateUID = CreateUID;