import { Schema, model } from 'mongoose';

import { Registry } from '#modules/Registry';
Registry.register({
  name: "Models",
  group: "database",
  details: ['guild', 'user', 'log', 'SOP', 'ships', 'venture']
});

const Any = Schema.Types.Mixed;

// Sous-schemas réutilisables
const SchemaMentionnable = new Schema({ type: String, id: String }, { _id: false });

const SchemaSanction = new Schema({
  type: String,
  id: String,
  timestamp: { type: Number, default: () => Date.timestamp() },
  endtimestamp: { type: Number, default: 0 },
  reason: { type: String, default: null },
  author: String
}, { _id: false });

// --- Modèles principaux ---

export const ModelGuild = model('guild', new Schema({
  id: { type: String, required: true, index: true },
  lang: { type: String, default: "default" },
  prefix: { type: Any, default: null },
  moderators: [SchemaMentionnable],
  administrators: [SchemaMentionnable],
  commands: [new Schema({
    name: { type: String, required: true },
    cooldown: Number,
    ban: [SchemaSanction],
    channelConfig: {
      mode: { type: Number, default: 0 },
      whitelist: [String],
      blacklist: [String],
    },
  }, { _id: false })],
}));

export const ModelUser = model('user', new Schema({
  guild: { type: String, required: true, index: true },
  id: { type: String, required: true, index: true },
  lang: { type: String, default: null },
  point: {
    value: { type: Number, default: 0 },
    dailyLimit: { type: Number, default: 0 },
  },
  cooldown: { type: Map, of: Number, default: {} }
}));

export const ModelVenturePlayer = model('venture_player', new Schema({
  id: { type: String, required: true },
  venture: { type: String, required: true },
  name: String,
  rewards: [Object],
  data: { type: Any, default: null }
}));


// export const ModelLog = model('log', new Schema({ uid: String, guild: String, type: String, data: Object, timestamp: Number }));
export const ModelSopCharacter = model('sop_character', new Schema({
	uid: {type: String, required: true},
	group_slug: { type: String, required: true },
  name: {type: String, default: 'John Doe'},
	arcs: {
    type: [ {
      id: { type: String, required: true },
      name: { type: String, required: true },
    } ],
    default: []
  },
	stats: {
		smashed: { type: Number, default: 0 },
		passed: { type: Number, default: 0 },
	},
	rules: {
		can_be_smash: { type: Boolean, default: true },
		can_be_pass: { type: Boolean, default: true },
    owner: { type: String, required: true },
    editors: {
      type: [{
        type: { type: String, required: true },
        id: { type: String, required: true },
        name: { type: String },
        guild: { type: String },
        value: { type: Number, default: 0 },
      }],
      default: [],
    },
	},
	outfits: {
		type: [{
      id: { type: String, required: true },
			name: { type: String, required: true },
      arc: { type: String, default: null },
			artist: {
        name: { type: String, default: null },
        link: { type: String, default: null },
      },
			filename: { type: String, default: null },
		}],
		default: []
	}
}));

export const ModelSopGroup = model('sop_group', new Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true, required: true }, // ex: "vlc", "nouvelle-aube"
  
  ownerId: { type: String, required: true },
  
  permissions: [{
    type: { type: String, required: true }, // guild, role, user
    id: { type: String, unique: true, required: true },
    name: { type: String },
    guild: { type: String },
    value: { type: Number, default: 0 }, // BitFlag
  }],

  settings: {
    isPublic: { type: Boolean, default: false }, // si public → par défaut toutes les guild peuvent voir et lire la le 'group' de personnage
  }
}));

export const ModelShip = model('ship', new Schema({
	uid: { type: String, required: true },
	guild: String,
	author: String,
	votes: { type: Number, default: 0 },
	editors: { type: Array, default: [] },
	universes: { type: Array, default: [] },
	characters: { type: Array, default: [] },
	type: { type: String, default: 'fictif' },
	image: String
}));

export const LogModel = model("log", new Schema({
  uid: { type: String, required: true, unique: true },
  context: { type: Object, default: {} },
  data: { type: Buffer, required: true },
  type: { type: String, default: 'generic' },
  createdAt: { type: Date, default: Date.now }
}));