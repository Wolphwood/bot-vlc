// ========================================================================== //
global.loadedModules.events.push({
    name: "Database Manager (MongoDb)",
    version: "1.0"
});
// ========================================================================== //

// Connexion BDD
require('./Mongoose');

const { Model } = require("mongoose");

// Importation des Schemas
const {
	ModelGuild, ModelUser, ModelLog,
	ModelSOP,
	ModelVenturePlayer,
	ModelVentureSituation, ModelVentureProcedure, ModelVentureTranslations, ModelVenture,
} = require("./Models.js");


module.exports = class Manager {
	constructor(){};
	
	guild = {
		model: ModelGuild,
		exist: async (guild) => {
			let id = guild instanceof Model || guild instanceof Object ? guild.id : guild;
			return await ModelGuild.findOne({ id }) !== null;
		},
		get: async (guild, options) => {
			if (!this.guild.exist(guild)) throw 'NON_EXISTING_GUILD_SETTINGS';
			let id = guild instanceof Model || guild instanceof Object ? guild.id : guild;
			return await ModelGuild.findOne({ id }, options);
		},
		getAll: async (options) => {
			return await ModelGuild.find({}, options);
		},
		set: async (guild, o) => {
			if (!this.guild.exist(guild)) throw 'NON_EXISTING_GUILD_SETTINGS';
			let id = guild instanceof Model || guild instanceof Object ? guild.id : guild;

			return ModelGuild.updateOne({ id }, {$set: o});
		},
		update: async (guild, o) => {
			if (!this.guild.exist(guild)) throw 'NON_EXISTING_GUILD_SETTINGS';
			let id = guild instanceof Model || guild instanceof Object ? guild.id : guild;

			return ModelGuild.updateOne({ id }, o);
		},
		create: async (data) => {
			if (!this.guild.exist(data.id)) throw 'ALREADY_EXISTING_GUILD_SETTINGS';
			let guild = new ModelGuild(data);
			await guild.save();
			return guild;
		},
	}
	
	user = {
		exist: async (guild,id) => {
			return await ModelUser.findOne({guild,id}) !== null;
		},
		get: async (guild, id, options) => {
			if (!this.user.exist(guild,id)) throw 'NON_EXISTING_USER_SETTINGS';
			return await ModelUser.findOne({guild, id}, options);
		},
		getAll: (guild, options) => {
			return ModelUser.find({ guild }, options);
		},
		getListed: (guild, ids, options) => {
			return ModelUser.find({ guild, id: { $in: ids } }, options);
		},
		create: async (data) => {
			if (!this.user.exist(data.guild,data.id)) throw 'ALREADY_EXISTING_EXIST_SETTINGS';
			let user = new ModelUser(data);
			await user.save();
			return user;
		},

		getRanked: (guild, ids, options) => {
			return ModelUser.find({ guild, id: { $in: ids }, rankable: true }, options);
		},
		
		increment: (guild, id, o) => {
			return ModelUser.updateOne({guild, id}, {$inc: o});
		},
		set: (guild, id, o) => {
			return ModelUser.updateOne({guild, id}, {$set: o});
		},
		push: async (guild, id, o) => {
			return ModelUser.updateOne({guild, id}, {$push: o});
		},
	}
	
	log = {
		exist: async (guild,uid) => {
			return await ModelLog.findOne({guild,uid}) !== null;
		},
		get: async (guild,uid) => {
			if (!this.log.exist(guild,uid)) throw 'NON_EXISTING_LOG';
			return await ModelLog.findOne({guild, uid}, {_id:0});
		},
		getAll: async (guild) => {
			return await ModelLog.find({guild}, {_id:0});
		},
		getAllUID: async (guild) => {
			return await ModelLog.find({guild}, {uid:1});
		},
		create: async (data) => {
			if (!this.log.exist(data.guild,data.uid)) throw 'ALREADY_EXISTING_LOG';
			let log = new ModelLog(data);
			await log.save();
			return log;
		},
		delete: async (guild,uid) => {
			return await ModelLog.deleteOne({guild,uid});
		},
	}

	SOP = {
		exist: async (guild,uid) => {
			return await ModelSOP.findOne({guild,uid}) !== null;
		},
		get: async (guild,uid) => {
			if (!this.SOP.exist(guild,uid)) throw 'NON_EXISTING_SOP_SETTINGS';
			return await ModelSOP.findOne({guild, uid});
		},
		getAll: async (guild) => {
			return await ModelSOP.find({guild});
		},
		getAllUID: async (guild) => {
			return await ModelSOP.find({guild}, {uid:1});
		},
		create: async (data) => {
			if (!this.SOP.exist(data.guild, data.uid)) throw 'ALREADY_EXISTING_SOP';

			if (!data.uid) {
				let uuids = await this.SOP.getAllUID();
				data.uid = CreateUID(uuids, {size: 8});
			}

			let sop = new ModelSOP(data);
			await sop.save();
			return sop;
		},
		delete: async (guild,uid) => {
			return await ModelSOP.deleteOne({guild,uid});
		},
		smash: async (guild, uid, count = 1) => {
			return ModelSOP.updateOne({guild, uid}, {
				$inc: { [`stats.smashed`]: count }
			})
		},
		pass: async (guild, uid, count = 1) => {
			return ModelSOP.updateOne({guild, uid}, {
				$inc: { [`stats.passed`]: count }
			})
		},
	}

	#venturePlayer = { // Start using new syntax 
		model: ModelVenturePlayer,
		exist: async (query, projections = {}, options = {}) => {
			return await ModelVenturePlayer.findOne(query, projections, options) !== null;
		},
		load: async (data) => {
			if (await this.#venturePlayer.exist({ id: data.id, venture: data.venture })) {
				return this.#venturePlayer.get({ id: data.id, venture: data.venture });
			} else {
				return this.#venturePlayer.create(data);
			}
		},
		get: async (query, projections = {}, options = {}) => {
			if (!this.#venturePlayer.exist(query, options)) throw 'NON_EXISTING_VENTURE_PLAYER_SETTINGS';
			return await ModelVenturePlayer.findOne(query, projections, options);
		},
		getAll: async (query, projections = {}, options = {}) => {
			return await ModelVenturePlayer.find(query, projections, options);
		},
		create: async (data) => {
			let { id } = data;
			if (!this.#venturePlayer.exist({id})) throw 'ALREADY_EXISTING_VENTURE_PLAYER';

			let document = new ModelVenturePlayer(data);
			await document.save();

			console.debug("document :")
			console.inspect(document)

			return document;
		},
		delete: async (query) => {
			return await ModelVenturePlayer.deleteOne(query);
		},
	}

	#venureGames = {

	}

	venture = {
		player: this.#venturePlayer
	}
}