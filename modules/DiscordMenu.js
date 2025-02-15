const fs = require('fs');
const { Message, CommandInteraction, GuildMember, ComponentType, ButtonStyle } = require("discord.js");
const { BotError, BotRangeError, BotTypeError } = require("./Errors");

const {
	noop,
	isBoolean, isObject, isArray, isString, isNumber, isEmpty, isNull, isDefined, isFunction
} = require('./functions/Utils.js');

module.exports = class DiscordMenu {
	#methods; #pagemapIndex;
	constructor(options) {
		this.sid = new ShortUniqueId({ dictionary: 'alphanumeric', length: 10, checkCollision: false });

		this.sent = false;
        this.uid = null;
        this.actions = {};
        this.data = isObject(options.data) ? options.data : {};

        this.pageIndex = 0;
        this.pages = isArray(options.pages) ? options.pages.map(page => ({
            allowedMembers: [],
            ...page
        })) : [];
        this.#_mapPages();

        this.sendOption = { ephemeral: isBoolean(options.ephemeral) ? options.ephemeral : null };
        this.deleteOnClose = isBoolean(options.deleteOnClose) ? options.deleteOnClose : true;
        this.element = options.element;
        this.message = null;

        // Gestion des membres
        let members = isArray(options.members) 
            ? options.members.map(m => m instanceof GuildMember ? m.id : m)
            : options.member 
                ? [options.member.id] 
                : options.element && options.element.member
                    ? [options.element.member.id] 
                    : null;

        if (!isArray(members) || members.length === 0) {
            throw new BotRangeError('MinSize', 'members', 1);
        }
        this.members = members;

        // Handlers
        this.beforeUpdate = isFunction(options.beforeUpdate) ? options.beforeUpdate 
            : isFunction(options.update) ? options.update 
            : () => {};
        this.afterUpdate = isFunction(options.afterUpdate) ? options.afterUpdate : () => {};
        this.onCollect = isFunction(options.onCollect) ? options.onCollect : () => {};
        this.defaultCollect = true;
        this.onEnd = isFunction(options.onEnd) ? options.onEnd : () => {};
        this.defaultEnd = true;

        // Collector
        this.collector = null;
        this.collectorOptions = isObject(options.collectorOptions) 
            ? options.collectorOptions 
            : { idle: 2 * 60 * 1000 };

        // Langue
        this.lang = isString(options?.lang) ? options.lang : 'default';

        /* CHECKING */
        if (this.pages.length === 0) throw new BotRangeError("MinSize", 'page', 1);
        if (!this.element) throw new BotTypeError("WrongType", 'element', ["Message", "CommandInteraction"]);
    }

	#_mapPages() {
		this.#pagemapIndex = new Map();
		this.pages.forEach((page, index) => {
			if (page.name) {
				this.#pagemapIndex.set(page.name, index);
			}
		});
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

	get page() { // Return Current Page
		return this.pages[this.pageIndex] ?? this.pages[0];
	}

	async #processComponents(array) {
		this.actions = {};

		const processComponent = ( data ) => { // Component processor.
			let uid = this.sid.random();
			this.actions[uid] = data.action ?? null;
			
			if (typeof data.disabled === 'function') {
				data.disabled = data.disabled.apply(this, [{ pages: this.pages, page: this.page, index: this.pageIndex }]) ?? false;
			}

			return Object.assign(Object.assign({ type: ComponentType.Button, style: ButtonStyle.Secondary }, { ...data }), { customId: this.uid +':'+ uid });
		}

		const processComponents = async ( element ) => { // Main brain for processing each element.
			if (typeof element === 'function') {
				element = await element.apply(this, [{ pages: this.pages, page: this.page, index: this.pageIndex }]);
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

		let elements = typeof array == 'function' ? await array.apply(this, []) : array;
		let components = await Promise.all(elements.map(processComponents));

		return components.flat();
	}

	findPageIndex(pagename) {
		return this.pages.findIndex(p => p.name == pagename);
	}

	goto(target) {
		let value = Number(target);
		if (!isNaN(value) && value >= 0 && value < this.pages.length) {
			if (this.pages[value]) this.pageIndex = value;
		} else
		if (this.#pagemapIndex.has(target)) {
			this.pageIndex = this.#pagemapIndex.get(target);
		}
	}

	handleError(error) {
		console.error(error);

		if (!fs.existsSync('./logs/errors/DiscordMenu')) {
			fs.mkdirSync('./logs/errors/DiscordMenu', { recursive: true });
		}

		fs.appendFileSync(`./logs/errors/DiscordMenu/${Date.timestamp(0)}.txt`, Object.getOwnPropertyNames(error).map(k => error[k]).join(''));
		
		this.element.channel.send(`${this.element.member} An error has occured, please refer to this timestamp : \`${Date.timestamp(0)}\``).catch(noop);
	}

	async _prepareMessageContent() {
		return typeof this.page?.content === 'function'
			? await this.page?.content.apply(this, [])
			: this.page?.content ?? null;
	}

	async _prepareMessageEmbeds() {
		return typeof this.page?.content === 'function'
			? await this.page?.content.apply(this, [])
			: this.page?.content ?? null;
	}
	
	async _prepareMessageFiles() {
		return typeof this.page?.content === 'function'
			? await this.page?.content.apply(this, [])
			: this.page?.content ?? null;
	}

	async _prepareMessageComponents() {
		return await this.#processComponents(this.page?.components) ?? [];
	}

	async prepareMessage() {
		const [components, content, embeds, files] = await Promise.all([
			this._prepareMessageComponents(),
			this._prepareMessageContent(),
			this._prepareMessageEmbeds(),
			this._prepareMessageFiles()
		]);
	
		return { content, components, embeds, files };
	}

	async runHook(parent, hookName, arugments = []) {
		let hook = parent[hookName];
		if (typeof hook === 'function') {
			await hook.apply(this, arugments);
		}
	}

	async send() {
		if (this.sent) throw new BotError("This menu is already sent.");

		try {
			this.uid = this.element.id +'_'+ Date.timestamp();
			
			let _beforeUpdate = await this.runHook(this, 'beforeUpdate', []);
			if (_beforeUpdate) return;

			let _pageBeforeUpdate = await this.runHook(this.page, 'beforeUpdate', []);
			if (_pageBeforeUpdate) return;

			let { content, components, embeds, files } = await this.prepareMessage();

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

			let _afterUpdate = await this.runHook(this, 'afterUpdate', []);
			if (_afterUpdate) return;

			let _pageafterUpdate = await this.runHook(this.page, 'afterUpdate', []);
			if (_pageafterUpdate) return; // useless but, yes.
		} catch (error) {
			this.handleError(error);
		}
	}

	async update(interaction) {
		if (this.collector.ended) return;
		if (!this.page) return;
		
		try {
			let _beforeUpdate = await this.runHook(this, 'beforeUpdate', [interaction]);
			if (_beforeUpdate) return;

			let _pageBeforeUpdate = await this.runHook(this.page, 'beforeUpdate', [interaction]);
			if (_pageBeforeUpdate) return;

			let { content, components, embeds, files } = await this.prepareMessage();

			if ( this.element instanceof Message ) await this.message.edit({content, components, embeds, files});
			if ( this.element instanceof CommandInteraction ) await this.element.editReply({content, components, embeds, files});

			let _afterUpdate = await this.runHook(this, 'afterUpdate', [interaction]);
			if (_afterUpdate) return;

			let _pageafterUpdate = await this.runHook(this.page, 'afterUpdate', [interaction]);
			if (_pageafterUpdate) return; // useless but, yes.
		} catch (error) {
			this.handleError(error);
		}
	}

	async handle() {
		let AllCollected = [];
		let restart = false;

		try {
			return new Promise(async (resolve,reject) => {
				do {
					restart = false;

					this.collector = this.message.createMessageComponentCollector(Object.assign( {...this.collectorOptions}, {filter: this.filter} ));
	
					let reason = await new Promise((rs,re) => {
						try {
							this.collector.on('collect', async (interaction) => {
								let skip = await this.onCollect.apply(this, interaction);
								if (!this.defaultCollect || skip) return;
								
								let stillUpdate = true;
	
								if (!interaction.customId) return;
								let actionKey = interaction.customId.split(':').pop();
								let action = this.actions[actionKey];
			
								if (typeof action === "string") {
									let [ act, ...args ] = action.simplify().split(/[:\s]/gmi);
									
									switch(act.toLowerCase()) {
										case "gotopage":
										case "goto":
											this.goto(args.join(':'));
										break;
				
										case "next":
										case "nextpage":
											this.goto(this.pageIndex + 1);
										break;
										
										case "previous": case "prev":
										case "previouspage": case "prevpage":
											this.goto(this.pageIndex - 1);
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
								if (this.pageIndex > this.pages.length - 1) this.pageIndex = this.pages - 1;
								if (this.pageIndex < 0) this.pageIndex = 0;
				
								if (stillUpdate) await this.update(interaction);
								
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
		} catch (error) {
			this.handleError(error);
		}
	}
}