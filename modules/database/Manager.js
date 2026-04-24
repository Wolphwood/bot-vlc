import { Registry } from '#modules/Registry';
import * as Models from './Models.js';
import './MongooseConnection.js';

import { gzipSync, gunzipSync } from 'zlib';
import ShortUniqueId from '#modules/ShortUniqueId';
import { PERMISSION, SOP_PERMISSION } from '#constants';
import { MD5 } from '#modules/Utils';

Registry.register({
  name: "Database Manager",
  group: "database",
  version: "1.1",
  details: ['guild', 'user', 'log', 'SOP', 'ships', 'venture']
});

export class Manager {
  constructor() {}

	async #loadUUIDS_SOP() {
		let uuids = await this.SOP.character.getAllUID();
		this.sopUUIDs = new ShortUniqueId({ dictionary: 'alphanumeric', length: 8, uuids });
	}

	async #loadUUIDS_SHIP() {
		let uuids = await this.ships.getAllUID();
		this.sopUUIDs = new ShortUniqueId({ dictionary: 'alphanumeric', length: 8, uuids });
	}

	async #loadUUIDS_LOG() {
		let uuids = await this.log.getAllUID();
		this.logUUIDs = new ShortUniqueId({ dictionary: 'alphanumeric', length: 8, uuids });
	}

  /**
   * Utilitaire privé pour extraire l'ID d'un objet ou d'une string
   */
  #resolveId(obj) {
    return obj?.id || obj;
  };

  guild = {
    exist: (id) => {
			return Models.ModelGuild.exists({ id: this.#resolveId(id) });
		},
    get: async (id, options = {}) => {
      const doc = await Models.ModelGuild.findOne({ id: this.#resolveId(id) }, options);
      if (!doc) throw new Error('NON_EXISTING_GUILD_SETTINGS');
      return doc;
    },
    create: async (data) => {
      if (await this.guild.exist(data.id)) throw new Error('ALREADY_EXISTING_GUILD');
      return await new Models.ModelGuild(data).save();
    },
    update: (id, update) => {
      return Models.ModelGuild.updateOne({ id: this.#resolveId(id) }, update);
    },
  };

  user = {
    exist: async (guildId, userId) =>
      await Models.ModelUser.exists({ guild: guildId, id: userId }),

    get: async (guildId, userId, options = {}) => {
      const doc = await Models.ModelUser.findOne({ guild: guildId, id: userId }, options);
      if (!doc) throw new Error('NON_EXISTING_USER_SETTINGS');
      return doc;
    },

    increment: (guildId, userId, data) =>
      Models.ModelUser.updateOne({ guild: guildId, id: userId }, { $inc: data }),

    create: async (data) => {
      if (await this.user.exist(data.guild, data.id)) throw new Error('USER_ALREADY_EXISTS');
      return await new Models.ModelUser(data).save();
    }
  };

	#GroupAuth(group, member, userPermission) {
		let userBitfield = 0;

		if (userPermission >= PERMISSION.ADMIN || group.ownerId === member.id) {
			userBitfield = 0xFF;
		} else {
			const userRoles = member.roles?.cache ? member.roles.cache.map(r => r.id) : [];
			const guildId = member.guild?.id || null;

			for (const p of group.permissions) {
				const isUser = p.type === 'user' && p.id === member.id;
				const isRole = p.type === 'role' && userRoles.includes(p.id);
				const isGuild = guildId && p.type === 'guild' && p.id === guildId;

				if (isUser || isRole || isGuild) {
					userBitfield |= p.value;
				}
			}

			if (group.settings?.isPublic) {
				userBitfield |= SOP_PERMISSION.READ;
			}
		}

		return {
			...group,
			can: (perm) => (userBitfield & perm) === perm,
			hasAny: (permsArray) => permsArray.some(p => (userBitfield & p) === p),
			permissionsValue: userBitfield,
			isOwner: group.ownerId === member.id
		};
	}

  SOP = {
		group: {
			get: async (slug) => {
				const group = await Models.ModelSopGroup.findOne({ slug });
				if (!group) throw "GROUP_NOT_FOUND";
				return group;
			},
			getAll: (options = {}) => {
				return Models.ModelSopGroup.find({}, options);
			},
			getWithAuth: async (slug, member, userPermission) => {
				const groups = await Models.ModelSopGroup.find(slug ? { slug } : {}).lean();

				return groups.map(group => this.#GroupAuth(group, member, userPermission));
			},
			create: async (data) => {
				try {
					return new Models.ModelSopGroup(data).save();
				} catch (err) {
					console.error(err);
					return null;
				}
			},
			createWithAuth: async (data, member, userPermission) => {
				let group = await this.SOP.group.create(data);

				if (!group) return null;
				await group.save();

				return this.#GroupAuth(group.toObject(), member, userPermission);
			},
			delete: async (slug) => {
				return await Models.ModelSopGroup.deleteOne({ slug });
			},
			updatePermission: async (slug, perm, auth) => {
				let updated = await Models.ModelSopGroup.findOneAndUpdate(
					{
						slug,
						permissions: {
							$elemMatch: { 
								id: perm.id, 
								type: perm.type 
							}
						}
					},
					{
						$set: {
							"permissions.$": perm
						}
					},
					{ returnDocument: 'after' }
				).lean();

				if (!updated) {
					updated = await Models.ModelSopGroup.findOneAndUpdate(
						{ slug },
						{
							$push: { permissions: perm }
						},
						{ returnDocument: 'after' }
					).lean();
				}
				
				return auth ? this.#GroupAuth(updated, auth.member, auth.userPermission) : updated;
			},
			removePermission: async (slug, perm, auth) => {
				const updated = await Models.ModelSopGroup.findOneAndUpdate(
					{ slug },
					{
						$pull: {
							permissions: {
								id: perm.id,
								type: perm.type
							}
						}
					},
					{ returnDocument: 'after' }
				).lean();

				return auth ? this.#GroupAuth(updated, auth.member, auth.userPermission) : updated;
			},
			setPublic: async (slug, value, auth) => {
				const updated = await Models.ModelSopGroup.findOneAndUpdate(
					{ slug },
					{ $set: { "settings.isPublic": !!value } },
					{ returnDocument: 'after' }
				).lean();
				
				if (!updated) return null;

				return auth ? this.#GroupAuth(updated, auth.member, auth.userPermission) : updated;
			},
		},
		character: {
			exist: async(uid) => {
				return (await Models.ModelSopCharacter.findOne({ uid })) !== null;
			},
			get: async (uid) => {
				const doc = await Models.ModelSopCharacter.findOne({ uid });
				if (!doc) throw 'NON_EXISTING_SOP_SETTINGS';
				return doc;
			},
			getSorted: async ({ limit = 10, sort = 'random', filter = {} } = {}) => {
				const pipeline = [
					{ $match: filter },
					{
						$addFields: {
							ratio: {
								$cond: [
									// 1. Calcul du volume total pondéré pour vérifier s'il est égal à 0
									{
										$eq: [
											{
												$add: [
													{ $ifNull: ["$stats.smashed", 0] },
													{ $multiply: [{ $ifNull: ["$stats.super_smashed", 0] }, 2] },
													{ $ifNull: ["$stats.passed", 0] },
													{ $multiply: [{ $ifNull: ["$stats.super_passed", 0] }, 2] }
												]
											},
											0
										]
									},
									0, // Si total = 0, ratio = 0
									// 2. Calcul du ratio pondéré
									{
										$divide: [
											// NUMÉRATEUR : (S + SS*3) - (P + SP*3)
											{
												$subtract: [
													{
														$add: [
															{ $ifNull: ["$stats.smashed", 0] },
															{ $multiply: [{ $ifNull: ["$stats.super_smashed", 0] }, 2] }
														]
													},
													{
														$add: [
															{ $ifNull: ["$stats.passed", 0] },
															{ $multiply: [{ $ifNull: ["$stats.super_passed", 0] }, 2] }
														]
													}
												]
											},
											// DÉNOMINATEUR : (S + SS*3) + (P + SP*3)
											{
												$add: [
													{ $ifNull: ["$stats.smashed", 0] },
													{ $multiply: [{ $ifNull: ["$stats.super_smashed", 0] }, 2] },
													{ $ifNull: ["$stats.passed", 0] },
													{ $multiply: [{ $ifNull: ["$stats.super_passed", 0] }, 2] }
												]
											}
										]
									}
								]
							}
						}
					}
				];

				if (sort == "random") { // Random Sort
					return Models.ModelSopCharacter.aggregate([
						...pipeline,
						{ $sample: { size: limit } },
					]);
				}

				const sorts = {
					alphabet: { name: 1 },
					anti_alphabet: { name: -1 },
					ratio: { ratio: -1 },
					anti_ratio: { ratio: 1 },
				}

				return Models.ModelSopCharacter.aggregate([
					...pipeline,
					{ $sort: sorts[sort] },
					{ $limit: limit },
				]);
			},
			getAll: async (slug) => {
				let filter = {};
				if (slug) filter.group_slug = slug;

				return await Models.ModelSopCharacter.find(filter);
			},
			getAllUID: async (slug) => {
				let filter = {};
				if (slug) filter.slug = slug;

				return await Models.ModelSopCharacter.find(filter, { uid: 1 }).lean();
			},
			setName: async (uid, name) => {
				return Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{ $set: { name } },
					{ returnDocument: 'after' }
				);
			},
			setDescription: async (uid, description) => {
				return Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{ $set: { description: description || null } },
					{ returnDocument: 'after' }
				);
			},
			updateArc: async (uid, arc) => {
				const setQuery = {};
				const data = arc.toObject ? arc.toObject() : arc;
				
				for (const key in data) if (key !== "id") setQuery[`arcs.$.${key}`] = data[key];

				if (Object.keys(setQuery).length > 0) {
					const updated = await Models.ModelSopCharacter.findOneAndUpdate(
						{ uid, 'arcs.id': arc.id },
						{ $set: setQuery },
						{ returnDocument: 'after' }
					);
					if (updated) return updated;
				}
				
				if (!arc.id) arc.id = MD5(arc.name);
				
				return await Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{
						$push: { arcs: arc }
					},
					{ returnDocument: 'after' }
				);
			},
			removeArc: async (uid, arc) => {
				return await Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{
						$pull: {
							arcs: {
								id: arc.id,
							}
						}
					},
					{ returnDocument: 'after' }
				);
			},
			updateOutfit: async (uid, outfit) => {
				const setQuery = {};
				
				const data = outfit.toObject ? outfit.toObject() : outfit;
				
				for (const key in data) {
					if (key == "id") continue;
					
					if (key == "artist" && data.artist) {
						if (data.artist.name !== undefined) setQuery[`outfits.$.artist.name`] = data.artist.name;
						if (data.artist.link !== undefined) setQuery[`outfits.$.artist.link`] = data.artist.link;
					} else {
						setQuery[`outfits.$.${key}`] = data[key];
					}
				}

				const updated = await Models.ModelSopCharacter.findOneAndUpdate(
					{ uid, 'outfits.id': outfit.id },
					{ $set: setQuery },
					{ returnDocument: 'after' }
				);

				if (!updated) {
					const character = await Models.ModelSopCharacter.findOne({ uid }).select('outfits.uid').lean();
					if (!character) return null;

					const existingUids = character.outfits.map(o => o.uid).filter(Boolean);
					let outfitid;
					let attempts = 0;

					do {
						outfitid = uid+'_'+Math.random().toString(36).substring(2, 8);
						attempts++;
						if (attempts > 10) outfitid += Date.now().toString(36).slice(-2);
					} while (existingUids.includes(outfitid));

					outfit.id = outfitid;

					return await Models.ModelSopCharacter.findOneAndUpdate(
						{ uid },
						{ $push: { outfits: outfit } },
						{ returnDocument: 'after' },
					);
				}

				return updated;
			},
			addOutfits: async (uid, outfits) => {
				const character = await Models.ModelSopCharacter.findOne({ uid }).select('outfits.uid').lean();
				if (!character) return null;

				const existingUids = character.outfits.map(o => o.uid).filter(Boolean);
				let outfitid;
				let attempts = 0;

				for (let outfit of outfits) {
					do {
						outfitid = uid+'_'+Math.random().toString(36).substring(2, 8);
						attempts++;
						if (attempts > 10) outfitid += Date.now().toString(36).slice(-2);
					} while (existingUids.includes(outfitid));

					outfit.id = outfitid;
					existingUids.push(outfitid);
				}

				return await Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{ $set: { outfits: outfits } },
					{ returnDocument: 'after' }
				);
			},
			removeOutfit: async (uid, outfit) => {
				return await Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{
						$pull: {
							outfits: { 
								name: outfit.name, 
								arc: outfit.arc 
							}
						}
					},
					{ returnDocument: 'after' }
				);
			},

			create: async (data) => {
				if (await this.SOP.character.exist(data.uid)) throw 'ALREADY_EXISTING_SOP';

				if (!data.uid) {
					if (!this.sopUUIDs) await this.#loadUUIDS_SOP();
					data.uid = this.sopUUIDs.random();
				}

				let character = new Models.ModelSopCharacter(data);
				await character.save();

				return character;
			},
			delete: async (uid) => {
				return await Models.ModelSopCharacter.deleteOne({ uid });
			},
			count: (filter) => {
				return Models.ModelSopCharacter.countDocuments(filter);
			},
			setSmashable: (uid, value) => {
				return this.SOP.character.setBooleanRule(uid, 'can_be_smash', value);
			},
			setPassable: (uid, value) => {
				return this.SOP.character.setBooleanRule(uid, 'can_be_pass', value);
			},
			setSuperSmashable: (uid, value) => {
				return this.SOP.character.setBooleanRule(uid, 'can_be_super_smash', value);
			},
			setSuperPassable: (uid, value) => {
				return this.SOP.character.setBooleanRule(uid, 'can_be_super_pass', value);
			},
			setBooleanRule: async (uid, rulename, value) => {				
				const updated = await Models.ModelSopCharacter.findOneAndUpdate(
					{ uid },
					{ $set: { [`rules.${rulename}`]: !!value } },
					{ returnDocument: 'after' }
				).lean();
				
				return updated;
			},

			smash: async (uid, count = 1) => {
				return Models.ModelSopCharacter.updateOne({ uid }, {
					$inc: { [`stats.smashed`]: count }
				})
			},
			pass: async (uid, count = 1) => {
				return Models.ModelSopCharacter.updateOne({ uid }, {
					$inc: { [`stats.passed`]: count }
				})
			},
			superSmash: async (uid, count = 1) => {
				return Models.ModelSopCharacter.updateOne({ uid }, {
					$inc: { [`stats.super_smashed`]: count }
				})
			},
			superPass: async (uid, count = 1) => {
				return Models.ModelSopCharacter.updateOne({ uid }, {
					$inc: { [`stats.super_passed`]: count }
				})
			},
			smashOutfit: async (uid, outfitId, count = 1) => {
				const r = await Models.ModelSopCharacter.updateOne(
					{ uid, "outfits.id": outfitId },
					{ $inc: { "outfits.$.stats.smashed": count } }
				);

				return r;
			},
			passOutfit: async (uid, outfitId, count = 1) => {
				return Models.ModelSopCharacter.updateOne(
					{ uid, "outfits.id": outfitId },
					{ $inc: { "outfits.$.stats.passed": count } }
				);
			},
			superSmashOutfit: async (uid, outfitId, count = 1) => {
				return Models.ModelSopCharacter.updateOne(
					{ uid, "outfits.id": outfitId },
					{ $inc: { "outfits.$.stats.super_smashed": count } }
				);
			},
			superPassOutfit: async (uid, outfitId, count = 1) => {
				return Models.ModelSopCharacter.updateOne(
					{ uid, "outfits.id": outfitId },
					{ $inc: { "outfits.$.stats.super_passed": count } }
				);
			},
		},
	};

	ships = {
		exist: async (guild, uid) => {
			return await Models.ModelShip.findOne({guild, uid}) !== null;
		},
		get: async (guild, uid) => {
			if (!this.ships.exist(guild, uid)) throw 'NON_EXISTING_SHIP_SETTINGS';
			return await Models.ModelShip.findOne({guild, uid});
		},
		getAll: async (guild) => {
			return await Models.ModelShip.find({guild});
		},
		getAllUID: async (guild) => {
			return await Models.ModelShip.find({guild}, {uid:1});
		},
		create: async (data) => {
			if (!data.uid) {
				if (!this.shipsUUIDs) await this.#loadUUIDS_SHIP();
				data.uid = this.shipsUUIDs.random();
			}

			if (!this.ships.exist(data.uid)) throw 'ALREADY_EXISTING_SOP';

			let ship = new Models.ModelShip(data);
			await ship.save();
			return ship;
		},
		delete: async (guild,uid) => {
			return await Models.ModelShip.deleteOne({guild,uid});
		},
		vote: async (guild, uid, count = 1) => {
			return Models.ModelShip.updateOne({guild, uid}, {
				$inc: { votes: count }
			})
		},
	};

  venture = {
    player: {
      get: async (query) => await Models.ModelVenturePlayer.findOne(query),

      load: async (data) => {
        let player = await Models.ModelVenturePlayer.findOne({ id: data.id, venture: data.venture });
        if (!player) {
          player = new Models.ModelVenturePlayer(data);
          await player.save();
          console.debug("Nouveau joueur Venture créé :");
          console.inspect(player);
        }
        return player;
      }
    }
  };

	log = {
		getContextFromElement: (type, element, data) => {
			const context = {
				seed: Math.round(Math.random() * Number.MAX_SAFE_INTEGER).toString(16).toUpperCase(),
				type: type || 'generic',
				timestamp: Date.timestamp(),
				element: {
					id: element?.id,
				},
				guild: {
					id: element?.guild?.id || 'DM',
					name: element?.guild?.name || "Direct Message",
				},
				channel: {
					id: element?.channel?.id || "DM",
					name: element?.channel?.name || "Direct Message",
				},
				member: {
					id: element?.member?.id,
					username: element?.member?.user?.username || "john_doe",
					name: element?.member?.displayName || "John Doe",
				},
			}

			if (data) context.data = data;
			
			return context;
		},
		getSearchFromContext: (logcontext) => {
			if (!logcontext) return {};

			return {
				guild: logcontext.guild?.id,
				channel: logcontext.guild?.id,
				author: logcontext.member?.id,
				type: logcontext.type,
				timestamp: logcontext.timestamp,
			}
		},
		
		getAllUID: async (filter = {}) => {
			return await Models.LogModel.find(filter, { uid: 1 }).lean();
		},
    save: async (data = {}, search = null) => {
			if (!this.logUUIDs) await this.#loadUUIDS_LOG();
			const uid = this.logUUIDs.random();

			if (!search) search = this.log.getSearchFromContext(data ?? {});
      
      // Compression du JSON en Buffer
      const compressed = gzipSync(JSON.stringify(data));

      const logEntry = new Models.LogModel({
        uid: uid,
				context: search || data.context || {},
				data: compressed,
        type: search.type || 'generic',
        createdAt: new Date()
      });

      await logEntry.save();
      return uid;
    },
    get: async (uid) => {
      const doc = await Models.LogModel.findOne({ uid });
      if (!doc) return null;

      try {
        // Décompression et parsing
        const decompressed = gunzipSync(doc.data);
        
				const data = JSON.parse(decompressed.toString());
				data.context = doc.context;

				return data;
      } catch (err) {
        console.error("Erreur lors de la décompression du log:", err);
        return null;
      }
    },
    exists: async (uid) => {
      return (await Models.LogModel.exists({ uid })) !== null;
    },
    delete: async (uid) => {
      return await Models.LogModel.deleteOne({ uid });
    }
  };
}

export const dbManager = new Manager();