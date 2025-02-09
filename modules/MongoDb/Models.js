const { Schema, model } = require("mongoose");
const Any = Schema.Types.Mixed
const client = require('../../app');


const SchemaMentionnable = new Schema({type: String, id: String}, { _id : false });
const SchemaSanction = new Schema({
	type: String,
	id: String,
	timestamp: {type: Number, default: Date.timestamp()},
	endtimestamp: {type: Number, default: 0},
	reason: {type: String, default: null},
	author: String
}, { _id : false });
const SchemaGuildCommandConfig = new Schema({
	name: { type: String, unique: true, required: true, index: true },
	cooldown: Number,
	ban: [ SchemaSanction ],
	channelConfig: {
		mode: {type: Number, default: client.CONSTANT.CHANNEL_CONFIG.BLACKLIST},
		whitelist: { type: [String], default: []},
		blacklist: { type: [String], default: []},
	},
}, { _id : false });

const SchemaGuild = new Schema({
	id: String,
	lang: { type: String, default: "default" },
	prefix: {
		type: Any,
		default: null,
		validate: {
			validator: function (value) {
				return value === null || typeof value === 'string';
			},
			message: 'Le champ "prefix" doit être un objet ou null'
		}
	},
	moderators: [ SchemaMentionnable ],
	administrators: [ SchemaMentionnable ],
	commands: [ SchemaGuildCommandConfig ],
	logging: {
		default: { type: Any, default: null },
		error: { type: Any, default: null },
		point: { type: Any, default: null },
		ban: { type: Any, default: null },
	},
});

const SchemaUser = {
	guild: String,
	id: String,
	lang: {type: String, default: null},
	point: {
		value: {type: Number, default: 0},
		dailyLimit: {type: Number, default: 0},
	},
	cooldown: { type: Map, of: Number, default: {} }
};

const SchemaLog = {
	uid: {type: String, required: true},
	guild: {type: String, required: true},
	type: {type: String, required: true},
	target: Object,
	author: Object,
	data: Object,
	timestamp: {type: Number, required: true},
	reason: {type: String, default: "¯\\_(ツ)_/¯"},
};

const SchemaSOP = {
	uid: {type: String, required: true},
	guild: {type: String, required: true},
	name: {type: String, default: 'John Doe'},
	arc: {type: String, default: 'Normal'},
	stats: {
		smashed: { type: Number, default: 0 },
		passed: { type: Number, default: 0 },
	},
	rules: {
		cant_be_smash: { type: Boolean, default: false },
		cant_be_pass: { type: Boolean, default: false },
	},
	outfits: {
		type: [ {
			name: { type: String, required: true },
			url: { type: String, default: null },
			base64: { type: String, default: null },
		} ],
		default: []
	}
};


const SchemaVenturePlayer = {
	id: { type: String, required: true }, // discord id
	venture: { type: String, required: true }, // venture id
	name: { type: String }, // save name
	rewards: [{ type: Object }],
	data: {
		type: Any, // Permet d'accepter différents types
		default: null, // Définit null comme valeur par défaut
		validate: {
			validator: function (value) {
				return value === null || typeof value === 'object';
			},
			message: 'Le champ "data" doit être un objet ou null'
		}
	}
}

const SchemaVentureSituation = {
	venture: { type: String, required: true },
	id: { type: String, required: true },
	description: String,
	image: {
		url: String,
		base64: String,
		file: String,
	},
	options: { type: Array, default: [] }
}
const SchemaVentureProcedure = {
	venture: { type: String, required: true },
	id: { type: String, required: true },
	requirements: [Any],
	actions: { type: Array, default: [] },
}
const SchemaVentureTranslations = {
	venture: { type: String, required: true },
	language_code: { type: String, required: true },
	name: { type: String, required: true },
	locales: Object,
}

const SchemaVenture = {
	uid: { type: String, required: true },
	name: String,
	author: {
		name: String,
		contact: {
			mail: String,
			website: String,
			twitter: String,
			bsky: String,
			instagram: String,
			discord: String,
		},
	},
	version: Any,
	tags: [String],
	presentation: String,
	initialization: {
		situation: String,
		stats: Object,
		inventory: Object,
		variable: Object,
	},
	translated: Boolean,
}


const SchemaShip = {
	uid: { type: String, required: true },
	guild: String,
	author: String,
	votes: { type: Number, default: 0 },
	editors: { type: Array, default: [] },
	universes: { type: Array, default: [] },
	characters: { type: Array, default: [] },
	type: { type: String, default: 'fictif' },
	image: String
}




module.exports.ModelVenturePlayer = model('venture_player', SchemaVenturePlayer);

module.exports.ModelVentureSituation = model('venture_situation', SchemaVentureSituation);
module.exports.ModelVentureProcedure = model('venture_procedure', SchemaVentureProcedure);
module.exports.ModelVentureTranslations = model('venture_translations', SchemaVentureTranslations);
module.exports.ModelVenture = model('venture', SchemaVenture);

module.exports.ModelGuild = model('guild', SchemaGuild);
module.exports.ModelUser = model('user', SchemaUser);
module.exports.ModelLog = model('log', SchemaLog);
module.exports.ModelSOP = model('sop', SchemaSOP);
module.exports.ModelShip = model('ship', SchemaShip);