// ========================================================================== //
global.loadedModules.modules.push({
    name: "Discord Functions",
    version: "1.1",
	details: [
		"Collection.array",
		"GetMember",
		"GetMultipleMembers",
		"isAdmin",
		"isValidUser",
		"DiscordMenu",
		"ModalForm",
	]
});
// ========================================================================== //

const { Message, CommandInteraction, GuildMember, Collection, PermissionFlagsBits, ComponentType, TextInputStyle, ButtonStyle } = require("discord.js");
const client = require("../../app");
const { BotError, BotRangeError, BotTypeError } = require("../Errors");

Collection.prototype.array = function() { return Array.from(this) };

async function GetMember(guild, string, includeBot = true, fetch = false) {
	if (string === undefined) return null;
	if (typeof guild === "string") guild = client.guilds.resolve(guild);
	
	let members;
	if (fetch) {
		members = (await guild.members.fetch()).filter(m => includeBot ? true : !m.user.bot);
	} else {
		members = guild.members.cache.filter(m => includeBot ? true : !m.user.bot);
	}

	let rawResults = [
		// id
		members.filter(member => member.id === string.replace(/[\\<>@&!]/g, "")),
		
		// username
		members.filter(m => m.user.username.toLowerCase().startsWith(string.toLowerCase())),
		members.filter(m => m.user.username.toLowerCase().includes(string.toLowerCase())),
		
		// nickname
		members.filter(m => m.nickname?.toLowerCase().startsWith(string.toLowerCase())),
		members.filter(m => m.nickname?.toLowerCase().includes(string.toLowerCase())),
	].map(result => {
		if (result === null || result === undefined) return null;
		if (result instanceof GuildMember) return result;

		if (result instanceof Collection) {
			if (result.size === 0) return null;
			if (result.size === 1) return result.at(0);
			return result;
		}

		return null;
	}).filter(e => e !== null);

	let results = [];
	await rawResults.forEach(member => {
		let found = results.find(m => {
			return m?.id === member.id;
		});
		if (!found) results.push(member);
	});
	
	return results.length === 1 ? results[0] : results;
}
exports.GetMember = GetMember;

async function GetMultipleMembers(guild, args, includeBot = true, fetch = false) {
	return Promise.all(
		Array.from(args).map(async (arg) => {
			return await GetMember(guild,arg,includeBot,fetch);
		})
	);
}
exports.GetMultipleMembers = GetMultipleMembers;

function isAdmin(element) {
	if (element.channel.type === 'DM') return false;
	if ( element.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
	return false;
};
exports.isAdmin = isAdmin;

// isValidUser()
function isValidUser(msg,usr) {
	console.warn("'isValidUser' is depreciated.");
	if (typeof usr === 'undefined') {msg.reply("Merci de préciser un utilisateur.");return false;}
	var _user = bot.users.resolve(usr.replace(/[\\<>@&!]/g, ""));
	if (_user === null) {msg.reply("Cet utilisateur n'est pas valide.");return false;}
	if (_user.bot) {msg.reply("Cet utilisateur est un bot.");return false;}
	return true;
};
exports.isValidUser = isValidUser;

Collection.prototype.array = function() {
	const array = [];
	this.forEach(e => array.push(e));
	return array;
}




const object = (v) => typeof v === "object" && !Array.isArray(v);
const defined = (v) => !(typeof v === "undefined");
const bool = (v,d) => typeof v === "boolean" ? v : d;
const string = (v,d) => typeof v === "string" ? v : d;
const number = (v,d,o) => typeof v === "number" ? v > 0 && bool((o??{}).p, true) ? v : v < 0 && bool((o??{}).n, true) ? v : v === 0 && bool((o??{}).z, true) ? v : d : d;
exports.DiscordMenu = class DiscordMenu {
	#methods
	constructor(options) {
		this.sid = new ShortUniqueId({ dictionary: 'alphanumeric', length: 10, checkCollision: false });

		this.sent = false;
		this.uid = null;

		this.actions = {};

		this.data = options.data ?? {};

		let _defaultPage = { allowedMembers: [] };
		this.pages = (options.pages ?? []).map(page => Object.assign({}, _defaultPage, page));
		this.page = 0;

		this._members = options.members ?? options.member ? [ options.member.id ] : options.element ? [ options.element.member.id ] : null;

		this.mode = ['interaction', 'message'].includes(options.mode?.toLower()) ? options.mode?.toLower() : 'message';
		
		this.sendOption = {
			ephemeral: bool(options.ephemeral, null),
		}

		this.deleteOnClose = options.deleteOnClose ?? true;

		this.element = options.element;
		this.message = null;

		let _defaultFilter = async (interaction) => {
			let members = [...this.members, ...this.pages[this.page]?.allowedMembers];
			if (!members.includes(interaction.user.id)) await interaction.deferUpdate();
        	return interaction.customId.startsWith(this.uid) && members.includes(interaction.user.id);
		};
		this.filter = options.filter ?? _defaultFilter;

		if (options.update) {
			console.warn(`'options.update' is depreciated, use 'options.beforeUpdate' instead`);
		}

		this.beforeUpdate = options.beforeUpdate ?? options.update ?? ( () => {} );
		this.afterUpdate = options.afterUpdate ?? ( () => {} );

		this.onCollect = options.onCollect ?? ( () => {} );
		this.defaultCollect = true;
		this.onEnd = options.onEnd ?? ( () => {} );
		this.defaultEnd = true;

		this.collector = null;
		this.collectorOptions = options.collectorOptions ?? { idle: 2*60*1000 };

		this.lang = string(options?.lang, 'default');

		/* CHECKING */
		if (this.pages.length === 0) throw new BotRangeError("MinSize", 'page', 1);
		
		if (!this.element) throw new BotTypeError("WrongType", 'element', ["Message", "CommandInteraction"]);

		if (!this._members) throw new BotTypeError("WrongTypes", 'members', ["Message", "CommandInteraction"]);
		if (this._members.length === 0) throw new BotRangeError('MinSize', 'members', 'page', 1);
		if (this._members.some(e => !( e instanceof GuildMember || typeof e === "string") )) throw new BotTypeError('WrongTypes', 'members', [ "GuildMember", "String" ]);
		this.members = this._members.map(member => member instanceof GuildMember ? member.id : member);
	}

	get methods() {
		const handle = (data) => {
			let handled = {};
	
			if (typeof data === 'object' && data !== null) {
				for (let key in data) {
					if (typeof data[key] === 'object') {
						handled[key] = handle(data[key]);
					} else
					if (typeof data[key] === 'function') {
						handled[key] = (...o) => data[key].apply(this, o);
					} else {
						handled[key] = data[key];
					}
				}
			}
	
			return handled;
		};
	
		return typeof this.data.methods === 'object' && this.data.methods !== null 
			? handle(this.data.methods)
			: {}
		;
	}
	

	async #processComponents(array) {
		this.actions = {};

		const processComponent = ( data ) => { // Component processor.
			let uid = this.sid.random();
			this.actions[uid] = data.action ?? null;
			
			if (typeof data.disabled === 'function') {
				data.disabled = data.disabled.apply(this, [{ pages: this.pages, page: this.pages[this.page], index: this.page }]) ?? false;
			}

			return Object.assign(Object.assign({ type: ComponentType.Button, style: ButtonStyle.Secondary }, { ...data }), { customId: this.uid +':'+ uid });
		}

		const processComponents = async ( element ) => { // Main brain for processing each element.
			if (typeof element === 'function') {
				element = await element.apply(this, [{ pages: this.pages, page: this.pages[this.page], index: this.page }]);
			}

			if (Array.isArray(element)) { // Array² of components
				if (element.some(Array.isArray)) {
					return await Promise.all(element.flatMap(async ( element ) => {
						return await processComponents(element);
					}));
				}
			}

			if (Array.isArray(element)) { // Array of components
				return { // Return an action row with processed components.
					type: ComponentType.ActionRow,
					components: element.flatMap(e => processComponent(e)),
				}
			}

			if (element.type === ComponentType.ActionRow ) { // Is an ActionRow component
				return Object.assign({...element}, { components: element?.components.map(processComponent) });
			}

			return element;
		}

		let components = await Promise.all((typeof array == 'function' ? array.apply(this, []) : array).flatMap(processComponents) );

		return components.flat();
	}

	findPageIndex(pagename) {
		return this.pages.findIndex(p => p.name == pagename);
	}

	goto(target) {
		if (isNaN(target)) {
			let index = this.pages.findIndex(p => p.name == target);
			if (index > -1) {
				this.page = index;
			}
		} else
		if (this.pages[Number(target)]) {
			this.page = Number(target);	
		}
	}

	async send() {
		if (this.sent) throw new BotError("This menu is already sent.");

		this.uid = this.element.id +'_'+ Date.time();

		let skip = this.beforeUpdate.apply(this, []);
		if (skip) return;

		if (typeof this.pages[this.page]?.beforeUpdate === 'function') {
			let skip = await this.pages[this.page]?.beforeUpdate.apply(this, []);
			if (skip) return;
		}

		let components = await this.#processComponents(this.pages[this.page]?.components) ?? [];

		let content = (typeof this.pages[this.page]?.content === 'function' ? await this.pages[this.page]?.content.apply(this, []) : this.pages[this.page]?.content) ?? null;
		let embeds = (typeof this.pages[this.page]?.embeds === 'function' ? await this.pages[this.page]?.embeds.apply(this, []) : this.pages[this.page]?.embeds) ?? [];
		let files = (typeof this.pages[this.page]?.files === 'function' ? await this.pages[this.page]?.files.apply(this, []) : this.pages[this.page]?.files) ?? [];

		if ( this.element instanceof Message ) {
			this.message = await this.element.reply(Object.assign({},
				{ content, components, embeds, files },
				this.sendOption
			));
		}

		if ( this.element instanceof CommandInteraction ) {
			this.message = await this.element.reply(Object.assign({},
				{ content, components, embeds },
				this.sendOption
			));
		}

		if (this.message) {
			this.sent = true;
		}

		this.collector = null;

		this.afterUpdate.apply(this, []);
		
		if (typeof this.pages[this.page]?.afterUpdate === 'function') {
			await this.pages[this.page]?.afterUpdate.apply(this, []);
		}
	}

	async update() {
		if (this.collector.ended) return;

		let skip = await this.beforeUpdate.apply(this, []);
		if (skip) return;
		
		if (typeof this.pages[this.page]?.beforeUpdate === 'function') {
			let skip = await this.pages[this.page]?.beforeUpdate.apply(this, []);
			if (skip) return;
		}

		let components = await this.#processComponents(this.pages[this.page]?.components ?? []) ?? [];

		let content = (typeof this.pages[this.page]?.content === 'function' ? await this.pages[this.page]?.content.apply(this, []) : this.pages[this.page]?.content) ?? null;
		let embeds = (typeof this.pages[this.page]?.embeds === 'function' ? await this.pages[this.page]?.embeds.apply(this, []) : this.pages[this.page]?.embeds) ?? [];
		let files = (typeof this.pages[this.page]?.files === 'function' ? await this.pages[this.page]?.files.apply(this, []) : this.pages[this.page]?.files) ?? [];

		if ( this.element instanceof Message ) await this.message.edit({content, components, embeds, files});
		if ( this.element instanceof CommandInteraction ) await this.element.editReply({content, components, embeds, files});

		this.afterUpdate.apply(this, []);
		
		if (typeof this.pages[this.page]?.afterUpdate === 'function') {
			await this.pages[this.page]?.afterUpdate.apply(this, []);
		}
	}

	async handle() {
		let AllCollected = [];
		let restart = false;

		return new Promise(async (resolve,reject) => {
			do {
				restart = false;

				this.collector = this.message.createMessageComponentCollector(Object.assign( {...this.collectorOptions}, {filter: this.filter} ));

				let reason = await new Promise((rs,re) => {
					try {
						this.collector.on('collect', async (interaction) => {
							await this.onCollect.apply(this, interaction);
							if (!this.defaultCollect) return;
			
							let stillUpdate = true;

							let action = this.actions[ interaction.customId.split(':').pop() ];
		
							if (typeof action === "string") {
								let [ act, ...args ] = action.simplify().split(/[:\s]/gmi);
		
								switch(act.toLowerCase()) {
									case "gotopage":
									case "goto":
										this.goto(args.join(':'));
									break;
			
									case "next":
									case "nextpage":
										this.page += 1;
									break;
									
									case "previous": case "prev":
									case "previouspage": case "prevpage":
										this.page -= 1;
									break;
			
									case "stop":
										this.collector.stop("stop");
									break;
								}
							} else if (typeof action === "function") {
								stillUpdate = ( await action.apply(this, [interaction]) ) ?? false;
							} else {
								interaction.deferUpdate().catch(noop);
							}

							// Sécurité de range des pages
							if (this.page > this.pages.length - 1) this.page = this.pages - 1;
							if (this.page < 0) this.page = 0;
			
							if (stillUpdate) await this.update();
							
							if (!interaction.deferred && !interaction.replied) await interaction.deferUpdate().catch(noop);
						});
			
						this.collector.on('end', async (collected, reason) => {
							AllCollected.push(...collected.values().array());
							await this.onEnd.apply(this, [AllCollected, reason]);
							rs(reason);
						});
					} catch (err) {
						re(err);
					}
				}).catch(reject);

				if (reason == 'renew') restart = true;
			} while (restart);
	
			if (this.defaultEnd ?? true) {
				if (this.deleteOnClose) {
					if (this.element instanceof Message) {
						this.message.delete();
					}
					
					if (this.element instanceof CommandInteraction) {
						if (!this.element.deferred) {
							this.element.deleteReply();
						}
					}
				}
			};

			resolve(AllCollected);
		});
	}
}

exports.ModalForm = class ModalForm {
	constructor({ interaction, title, translate, translateKeys, LangToUse, time } = {}) {
		this.interaction = interaction ?? null;
		this.title = title ?? "Modal";

		this.uid = null;
		this.modal = null;
		this.components = [];
		this.translate = translate ?? false;
		this.translateKeys = translateKeys ?? [];
		this.LangToUse = LangToUse ?? 'default';

		this.time = time ?? 60_000;
		this.names = [];

		return this;
	}

	#buildModal() {
		const uid = this.interaction.id +'_'+ Date.time();
		
		return {
			uid,
			title: this.title,
			custom_id: uid + ":modal",
			components: this.components.map(row => {
				row.components = row.components.map(component => {
					component.customId = uid +':'+ (component.name ?? 'component');
					if (this.translate) {
						component.label = Locale.get(this.LangToUse, component.label, this.translateKeys);
						component.placeholder = Locale.get(this.LangToUse, component.placeholder, this.translateKeys);
					}
					return component;
				});
				return row;
			}),
		}
	}

	setInteraction(interaction) {
		this.interaction = interaction;
		return this;
	}

	setTitle(title) {
		this.title = title;
	}

	addRow() { // Add row.
		this.components.push({ type: ComponentType.ActionRow, components: [] });
		return this;
	}

	removeRow(index) { // Remove specific row or the last one.
		if (index == undefined) index = this.components.length - 1;
		this.components = [...this.components.slice(0,index), ...this.components.slice(index+1)];
		return this;
	}

	addComponents(components, row) { // Add elements.
		if (row == undefined) row = this.components.length - 1;
		components.forEach(component => {
			this.components[row].components.push(Object.assign({ label: '\u200b', placeholder: '\u200b' }, component));
		});
		return this;
	}

	addTextField({ name, label, placeholder, value, required, row } = {}) { // Add short text field
		if (row == undefined) row = this.components.length - 1;
		this.components[row].components.push({
			type: ComponentType.TextInput,
			name: name ?? 'text',
			label: label ?? 'Short Text Field',
			placeholder: placeholder ?? '\u200b',
			style: TextInputStyle.Short,
			value, required
		});
		return this;
	}

	addParagraphField({ name, label, placeholder, value, required, row } = {}) { // Add short text field
		if (row == undefined) row = this.components.length - 1;
		this.components[row].components.push({
			type: ComponentType.TextInput,
			name: name ?? 'paragraph',
			label: label ?? 'Short Text Field',
			placeholder: placeholder ?? '\u200b',
			style: TextInputStyle.Paragraph,
			value, required
		});
		return this;
	}

	addButton({ name, label, style, emoji, row } = {}) { // Add button
		if (row == undefined) row = this.components.length - 1;
		this.components[row].components.push({
			type: ComponentType.Button,
			name: name ?? 'button',
			emoji: emoji,
			label: label ?? 'Short Text Field',
			style: style ?? ButtonStyle.Secondary,
		});
		return this;
	}

	setComponents(components, row) { // Set elements.
		if (row == undefined) row = this.components.length - 1;
		this.components[row].components = components.map(component => Object.assign({ label: '\u200b', placeholder: '\u200b' }, component));
		return this;
	}

	removeComponents(count, row) { // Remove N last elements.
		if (row == undefined) row = this.components.length - 1;
		if (count == undefined) count = 1;
		this.components[row].components = this.components[row].components.slice(count);
		return this;
	}
	
	removeComponent(index, row) { // Remove one specific element.
		if (row == undefined) row = this.components.length - 1;
		if (index == undefined) index = this.components[row].components.length - 1;
		this.components[row].components = [...this.components[row].components.slice(0,index), ...this.components[row].components.slice(index+1)];
		return this;
	}

	clone() {
		return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
	}

	async popup() {
		const modal = this.#buildModal();
		if (this.interaction.isRepliable()) {
			await this.interaction.showModal(modal);

			const filter = async (interaction) => {
				if (interaction.customId === modal.custom_id) {
					await interaction.deferUpdate();
					return true;
				}
				return false;
			}

			try {
				let entries = await this.interaction.awaitModalSubmit({ filter, time: this.time })
					.then(data => data.fields.fields.map((k,v) => [v.split(':')[1], k.value]))
					.catch(e => {})
				;

				if (!entries) return null;
				return new Collection(entries);
			} catch(err) {
				console.error(`[ MODAL-ERROR : ${Date.time()} ]`, err);
        		return null;
			}
		}
	}
}
