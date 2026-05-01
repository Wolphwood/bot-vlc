import { Registry } from '#modules/Registry';
import fs from "fs";
import path from "path";
import util from 'node:util';
import { GetRandomFunnyErrorMessage } from "./FunnyErrorMessages.js";

import {
	ComponentType, ButtonStyle,
  Message, BaseInteraction, GuildMember,
	MessageFlags,
	SeparatorSpacingSize,
} from 'discord.js';
import ShortUniqueId from "#modules/ShortUniqueId"

// const { BotError, BotRangeError, BotTypeError } = require("./Errors");
const BotError = Error;
const BotRangeError = RangeError;
const BotTypeError = TypeError;

import {
	noop,
	isBoolean, isObject, isArray, isString, isFunction,
	ValidateBoolean, selfnoop, isDefined, ValidateObject,
} from "#modules/Utils";
import { dbManager } from "#modules/database/Manager";

import { FetchImageAPI as FetchCatImageAPI}  from "#commands/hybrid/api_cat";
import { FetchImageAPI as FetchDogImageAPI}  from "#commands/hybrid/api_dog";
import { FetchImageAPI as FetchFoxImageAPI}  from "#commands/hybrid/api_fox";
import { FetchImageAPI as FetchDuckImageAPI} from "#commands/hybrid/api_duck";

Registry.register({
  name: "Discord Menu",
  group: "utils",
  version: "2.0",
  details: [
    "DiscordMenu",
  ]
});

export class DiscordMenu {
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
		
		this.ephemeral = ValidateBoolean(options.ephemeral, false);
		this.useComponentsV2 = ValidateBoolean(options.v2, false);
		this.sendOptions = ValidateObject(options.sendOptions, {});
		
		this.flags = [];
		if (this.ephemeral) this.flags.push(MessageFlags.Ephemeral);
		if (this.useComponentsV2) this.flags.push(MessageFlags.IsComponentsV2);
    
		this.deleteOnClose = ValidateBoolean(options.deleteOnClose, true);
    this.element = options.element;
    this.message = null;

    // Gestion des membres
    let members = isArray(options.members)
			? options.members.map(m => m instanceof GuildMember ? m.id : m)
			: options.member
				? [options.member.id]
				: options.element && options.element.member
					? [options.element.member.id]
					: null
		;

		this._ignoreDefaultCollectOnce = false;
		this._ignoreDefaultCollectFilterOnce = false;

    if (!isArray(members) || members.length === 0) throw new BotRangeError('MinSize', 'members', 1);
    this.members = members;

    // Handlers
    this.beforeUpdate = isFunction(options.beforeUpdate) ? options.beforeUpdate
			: isFunction(options.update) ? options.update
			: () => {}
		;
    this.afterUpdate = isFunction(options.afterUpdate) ? options.afterUpdate : () => {};

		this.onCollect = isFunction(options.onCollect) ? options.onCollect : () => {};
    this.useDefaultCollect = true;

		this.onEnd = isFunction(options.onEnd) ? options.onEnd : () => {};
    this.useDefaultEnd = true;

		this.filter = isFunction(options.filter) ? options.filter : () => true;
		this.useDefaultFilter = ValidateBoolean(options.useDefaultFilter, true);

    // Collector
    this.collector = null;
    this.collectorOptions = isObject(options.collectorOptions)
        ? options.collectorOptions
        : { idle: 2 * 60 * 1000 };

    // Langue
    this.lang = isString(options?.lang) ? options?.lang : 'default';

    /* CHECKING */
    if (this.pages.length === 0) throw new BotRangeError("MinSize", 'page', 1);
    if (!this.element) throw new BotTypeError("WrongType", 'element', ["Message", "BaseInteraction"]);
  }

	#CollectorFilter(OPT) {
		if (!this.useDefaultFilter) {
			const allowed = this.filter.call(this, OPT);
			if (!allowed) OPT.interaction.deferUpdate().catch(noop);
			return allowed;
		}

		const allowed = OPT.interaction.user.id == this.element.member.id || this.members.some(member => member.id == OPT.interaction.user.id);
		const bllowed = this.filter.call(this, OPT);

		if (!allowed || !bllowed) OPT.interaction.deferUpdate().catch(noop);
		return allowed && bllowed;
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
	
	async processComponents(array) {
		this.actions = {};
		const NonEmpty = (e) => isArray(e) ? e.length > 0 : e;

		
		const processUnit = (data) => {
			// Check if element is interactive
			const isInteractive = typeof data !== 'string' && ([
				ComponentType.Button,
				ComponentType.StringSelect,
				ComponentType.UserSelect,
				ComponentType.RoleSelect,
				ComponentType.MentionableSelect,
				ComponentType.ChannelSelect,
			].includes(data.type) || (!data.type && !data.content));

			if (isInteractive) {
				const forcedId = data.customId || data.custom_id;
				let uid = forcedId || this.sid.random();
				this.actions[uid] = data.action ?? null;

				if (typeof data.disabled === 'function') {
					data.disabled = data.disabled.call(this, { pages: this.pages, page: this.page, index: this.pageIndex }) ?? false;
				}

				return {
					type: ComponentType.Button,
					style: ButtonStyle.Secondary,
					...data,
					customId: forcedId || `${this.uid}:${uid}`
				};
			} else
			if (data.type === ComponentType.TextDisplay || (!data.type && data.content)) {
				if (!data.type) data.type = ComponentType.TextDisplay;
				if (Array.isArray(data.content)) data.content = data.content.filter(e => isDefined(e)).join('\n');
			}
			else if (typeof data === 'string') {
				const dividerMatch = data.match(/^(\.)?(-+|=+)$/);
				
				if (dividerMatch) {
					const [full, noLine, marks] = dividerMatch;
					const isLarge = marks.startsWith('=');
					
					return {
						type: ComponentType.Separator,
						spacing: isLarge ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small,
						divider: !noLine // Si on a un point au début, divider = false
					};
				}

				return {
					type: ComponentType.TextDisplay,
					content: data
				}
			}

			return data;
		};

		const processElement = async (element) => {
			if (typeof element === 'function') {
				element = await element.call(this, { pages: this.pages, page: this.page, index: this.pageIndex });
			}
			if (!element) return null;

			if (Array.isArray(element)) {
				if (element.filter(isDefined).every(isString)) { // Shortcut : [string] → TextDisplay
					return [
						processUnit(element.filter(isDefined).join('\n'))
					];
				} else
				if (element.some(Array.isArray)) {
					const nested = await Promise.all(element.filter(NonEmpty).map(processElement));
					return nested.flat();
				} else {
					return {
						type: ComponentType.ActionRow,
						components: await Promise.all(element.filter(NonEmpty).map(processElement)),
					}
				}
			}

			// --- SUPORT V2 ---
			if (element.accessory) element.accessory = processUnit(element.accessory);
			if (element.components && Array.isArray(element.components)) {
				element.components = await processElement(element.components.filter(NonEmpty));
				return element;
			}

			return processUnit(element);
		};

		let baseElements = typeof array == 'function' 
			? await array.call(this, { pages: this.pages, page: this.page, index: this.pageIndex }) 
			: array;
		
		if (!baseElements) return [];

		const finalComponents = await Promise.all(baseElements.filter(e => isString(e) || NonEmpty(e)).map(processElement));

		return finalComponents.flat().filter(selfnoop);
	}

	findPageIndex(pagename) {
		return this.pages.findIndex(p => p.name == pagename);
	}

	goto(target) {
		let value = Number(target);
		if (!isNaN(value) && value >= 0 && value < this.pages.length) {
			if (this.pages[value]) this.pageIndex = value;
			return true;
		} else
		if (this.#pagemapIndex.has(target)) {
			this.pageIndex = this.#pagemapIndex.get(target);
			return true;
		}
		return false;
	}

	async handleError(error) {
		console.error(`DISCORD MENU ERROR :`);
		console.error(error);
		
		try {
			const errorStack = util.inspect(error, {
				showHidden: true,
				depth: null,
				colors: false
			});

			const logcontext = dbManager.log.getContextFromElement("DiscordMenu", this.element, errorStack);
			const logfilecontext = dbManager.log.getContextFromElement("DiscordMenu", this.element, {});

			let image_url = null;
			let used_api = null;
			const apis = [
				{ name: "cataas.com", fn: FetchCatImageAPI },
				{ name: "dog.ceo", fn: FetchDogImageAPI },
				{ name: "randomfox.ca", fn: FetchFoxImageAPI },
				{ name: "random-d.uk", fn: FetchDuckImageAPI }
			].sort(() => Math.random() - 0.5);

			for (const api of apis) {
				image_url = await api.fn().catch(() => null);
				if (image_url) {
					used_api = api.name;
					break;
				}
			}

			const folder = './logs/dumps/DiscordMenu';
			const filename = `menu_${this.element.id}.json`;

			if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
			fs.appendFileSync(path.join(folder, filename), JSON.stringify(this.data, null, 2));

			const logUID = await dbManager.log.save(logcontext);
			const logfileUID = await dbManager.log.save({ ...logfilecontext, folder, filename });

			const payload = {
				flags: [MessageFlags.IsComponentsV2],
				components: [{
					type: ComponentType.Container,
					accent_color: 0xFF0000,
					components: [
						{
							type: ComponentType.TextDisplay,
							content: [
								"# uh-oh an error has occured",
								`## ${error.name || 'UNKNOWN ERROR'}: ${error.message}`,
								`${this.element.member} ${GetRandomFunnyErrorMessage()}`,
								image_url ? "In compensation, please accept this cute image:" : null,
							].filter(e => isDefined(e)).join("\n")
						},
						image_url && {
							type: ComponentType.MediaGallery,
							items: [
								{
									media: {
										url: image_url
									},
									spoiler: false
								}
							]
						},
						{
							type: ComponentType.TextDisplay,
							content: [
								image_url ? `-# Image via [${used_api}](https://${used_api})` : null,
								`-# \`${logUID}\` \`${logfileUID}\``,
							].filter(selfnoop).join('\n')
						},
						{
							type: ComponentType.Separator,
							spacing: SeparatorSpacingSize.Large,
							divider: true
						},
						{
							type: ComponentType.ActionRow,
							components: [
								{
									type: ComponentType.Button,
									style: ButtonStyle.Secondary,
									label: "Get Error File",
									custom_id: `GETLOG:DEV:${logUID}`
								},
								{
									type: ComponentType.Button,
									style: ButtonStyle.Secondary,
									label: "Get Dump File",
									custom_id: `GETFILE:DEV:${logfileUID}`
								},
							]
						},
					].filter(selfnoop)
				}]
			};

			if (this.element instanceof BaseInteraction) {
				if (this.element.deferred || this.element.replied) {
					await this.element.followUp(payload).catch(noop);
				} else {
					await this.element.reply(payload).catch(noop);
				}
			} else {
				await this.element.channel.send(payload).catch(noop);
			}
		} catch (err) {
			console.fatal(err)
		}
	}

	async _prepareMessageContent(O) {
		return typeof this.page?.content === 'function'
			? await this.page?.content.call(this, O)
			: this.page?.content ?? null;
	}

	async _prepareMessageEmbeds(O) {
		return typeof this.page?.embeds === 'function'
			? await this.page?.embeds.call(this, O)
			: this.page?.embeds ?? null;
	}

	async _prepareMessageFiles(O) {
		return typeof this.page?.files === 'function'
			? await this.page?.files.call(this, O)
			: this.page?.files ?? null;
	}

	async _prepareMessageComponents() {
		return await this.processComponents(this.page?.components) ?? [];
	}

	async prepareMessage(O) {
		const [components, content, embeds, files] = await Promise.all([
			this._prepareMessageComponents(),
			this._prepareMessageContent(O),
			this._prepareMessageEmbeds(O),
			this._prepareMessageFiles(O)
		]);

		const flags = this.flags;
		return this.useComponentsV2 ? { ...this.sendOptions, components, files, flags } : { ...this.sendOptions, content, components, embeds, files, flags };
	}

	async runHook(context, hookName, args = {}) {
		let hook = context[hookName];

		if (typeof hook === 'function') {
			try {
				return await hook.call(this, args);
			} catch (err) {
				await this.handleError(err);
			}
		}
	}

	async #refresh(isInitial = false, OPTIONS = {}) {
		let initialPage;
		
		// Boucle avec detection de redirection
		while (initialPage !== this.page) {
			initialPage = this.page;

			// Hook Global
			if (await this.runHook(this, 'beforeUpdate', OPTIONS)) return false;
			if (this.page !== initialPage) continue;

			// Hook de Page
			if (await this.runHook(this.page, 'beforeUpdate', OPTIONS)) return false;
			if (this.page !== initialPage) continue;
		}

		// Préparation du payload
		const payload = await this.prepareMessage(OPTIONS);

		// Exécution de l'ordre 66
		if (isInitial) { // 1st Send
			if (this.element instanceof BaseInteraction) {
				// On envoie la réponse
				if (this.element.replied || this.element.deferred) {
					await this.element.editReply(payload);
				} else {
					await this.element.reply(payload);
				}
				
				this.message = await this.element.fetchReply();
			}
			else if (this.element instanceof Message) {
				// Envoi classique via Message/Channel
				this.message = await this.element.channel.send(payload);
			} else {
				throw new TypeError("this.element must be instance of BaseInteraction or Message.");
			}
			this.sent = true;
		} else { // Updating
			if (this.element instanceof Message) {
				await this.message.edit({ ...payload, attachments: [] });
			} else {
				await this.element.editReply({ ...payload, attachments: [] });
			}
		}

		// Hooks After Global & de la page
		await this.runHook(this, 'afterUpdate', OPTIONS);
		await this.runHook(this.page, 'afterUpdate', OPTIONS);
		
		return true;
	}

	async send(OPTIONS = {}) {
		if (this.sent) throw new BotError("This menu is already sent.");
		this.uid = this.element.id + '_' + Date.timestamp();
		return await this.#refresh(true, OPTIONS);
	}
	
	async update(OPTIONS = {}) {
		if (this.collector?.ended || !this.page) return;
		return await this.#refresh(false, OPTIONS);
	}

	ignoreDefaultCollectOnce() {
		this._ignoreDefaultCollectOnce = true;
	}
	ignoreDefaultCollectFilterOnce() {
		this._ignoreDefaultCollectFilterOnce = true;
	}

	stop(reason = "stop") {
		if (!this.collector) throw new Error("No active collector"); 
		this.collector.stop(reason);
	}

	async handle({ client }) {
		let AllCollected = [];
		let restart = false;

		try {
			return new Promise(async (resolve,reject) => {
				do {
					restart = false;

					this.collector = this.message.createMessageComponentCollector(Object.assign( {...this.collectorOptions}, { filter: this.filter } ));
					
					let reason = await new Promise((rs,re) => {
						try {
							this.collector.on('collect', async (interaction) => {
								if (!interaction.customId) return;

								let actionKey = interaction.customId.split(':').pop();
								let action = this.actions[actionKey];

								if (!action) return;

								this.runHook(this.page, 'onCollect', { interaction });

								if (!this._ignoreDefaultCollectOnce) {
									this._ignoreDefaultCollectOnce = false;

									let skip = await this.onCollect.call(this, { interaction });
									if (!this.useDefaultCollect || skip) return;
								}

								if (!this._ignoreDefaultCollectFilterOnce) {
									this._ignoreDefaultCollectFilterOnce = false;

									const allowed = this.#CollectorFilter({ interaction });
									if (!allowed) return;
								}

								let stillUpdate = true;

								if (typeof action === "string") {
									let [ act, ...args ] = action.simplify().split(/[:\s]/gmi);

									switch(act.toLowerCase()) {
										case "gotopage":
										case "goto": {
											this.goto(args.join(':'));
											break;
										}

										case "next":
										case "nextpage": {
											this.goto(this.pageIndex + 1);
											break;
										}

										case "previous": case "prev":
										case "previouspage": case "prevpage": {
											this.goto(this.pageIndex - 1);
											break;
										}

										case "stop": {
											this.collector.stop("stop");
											break;
										}
									}
								} else
								if (typeof action === "function") {
									try {
										let r = await action.call(this, { client, interaction });
										stillUpdate = isBoolean(r) ? r : true;
									} catch(err) {
										this.handleError(err);
									}
								} else {
									interaction.deferUpdate().catch(noop);
								}

								// Sécurité de range des pages
								this.pageIndex = Math.clamp(this.pageIndex, 0, this.pages.lastIndex);

								if (!interaction.deferred && !interaction.replied) interaction.deferUpdate();

								if (stillUpdate) await this.update({ client, interaction });
							});

							this.collector.on('end', async (collected, reason) => {
								AllCollected.push(...collected.values().array());
								rs(reason);
							});
						} catch (err) {
							re(err);
						}
					}).catch(reject);

					if (reason == 'renew') restart = true;
				} while (restart);

				if (this.useDefaultEnd ?? true) {
					if (this.deleteOnClose) {
						if (this.element instanceof Message) {
							this.message.delete();
						}

						if (this.element instanceof BaseInteraction) {
							if (!this.element.deferred) {
								this.element.deleteReply();
							}
						}
					}
				};

				if (isFunction(this.onEnd)) {
					let responded = false;

					const rs = (...args) => {
						responded = true;
						resolve(...args);
					}
					const re = (...args) => {
						responded = true;
						reject(...args);
					}

					await this.onEnd.call(this, {
						collected: AllCollected, resolve: rs, reject: re,
					});

					if (responded) return;
				}

				resolve(AllCollected);
			});
		} catch (error) {
			await this.handleError(error);
		}
	}
}