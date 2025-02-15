module.exports = class DiscordMenu {
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

	get selectedPage() {
		return this.pages[this.page] ?? this.pages[0];
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

		this.uid = this.element.id +'_'+ Date.timestamp();

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

	async update(interaction) {
		if (this.collector.ended) return;

		let skip = await this.beforeUpdate.apply(this, [interaction]);
		if (skip) return;
		
		if (typeof this.pages[this.page]?.beforeUpdate === 'function') {
			let skip = await this.pages[this.page]?.beforeUpdate.apply(this, [interaction]);
			if (skip) return;
		}

		let components = await this.#processComponents(this.pages[this.page]?.components ?? []) ?? [];

		let content = (typeof this.pages[this.page]?.content === 'function' ? await this.pages[this.page]?.content.apply(this, []) : this.pages[this.page]?.content) ?? null;
		let embeds = (typeof this.pages[this.page]?.embeds === 'function' ? await this.pages[this.page]?.embeds.apply(this, []) : this.pages[this.page]?.embeds) ?? [];
		let files = (typeof this.pages[this.page]?.files === 'function' ? await this.pages[this.page]?.files.apply(this, []) : this.pages[this.page]?.files) ?? [];

		if ( this.element instanceof Message ) await this.message.edit({content, components, embeds, files});
		if ( this.element instanceof CommandInteraction ) await this.element.editReply({content, components, embeds, files});

		this.afterUpdate.apply(this, [interaction]);
		
		if (typeof this.pages[this.page]?.afterUpdate === 'function') {
			await this.pages[this.page]?.afterUpdate.apply(this, [interaction]);
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
	}
}