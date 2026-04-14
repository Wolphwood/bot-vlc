import { Registry } from '#modules/Registry';
import fs from "fs";
import path from "path";
import zlib from 'zlib';
import util from 'node:util';
import { promisify } from "util";
import { GetRandomFunnyErrorMessage } from "./FunnyErrorMessages.js";

import {
	ComponentType, ButtonStyle, TextInputStyle,
	ChannelType, PermissionFlagsBits,
  Message, CommandInteraction, GuildMember,
	Collection,
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
	ValidateBoolean,
	getRandomRangeRound,
	selfnoop,
	isDefined,
} from "#modules/Utils";
import { dbManager } from "#modules/database/Manager";

import { FetchImageAPI as FetchCatImageAPI} from "#commands/hybrid/api_cat";
import { FetchImageAPI as FetchDogImageAPI} from "#commands/hybrid/api_dog";
import { FetchImageAPI as FetchFoxImageAPI} from "#commands/hybrid/api_fox";

// MARK: Register Module
Registry.register({
  name: "Discord Utils",
  group: "utils",
  version: "2.1",
  details: [
    "IsMessageAuthorAdmin",
    "ModalForm",
		"DiscordMenu",
  ]
});

// MARK: IsMessageAuthorAdmin
export function IsMessageAuthorAdmin(element) {
  if (element.channel.type == ChannelType.DM) return false;
  return element.member.permissions.has(PermissionFlagsBits.Administrator);
}

// MARK: ModalForm
export class ModalForm {
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
		const uid = this.interaction.id +'_'+ Date.timestamp();

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

	addStringSelect({ placeholder, required, min, max, options, row } = {}) {
		if (row == undefined) row = this.components.length - 1;

		if (!Array.isArray(options)) options = [];

		const Z = () => {
			return {
				addOption: (opt = {}) => {
					options.push(opt);
					return Z();
				},
				deleteOption: (index) => {
					options = options.splice(index, 1);
					return Z();
				},
				done: () => {
					this.components[row].components.push({
						type: ComponentType.StringSelect,
						min_values: min, max_values: max,
						placeholder, required, options,
					});
					return this;
				}
			};
		}

		return Z();
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
					.catch(noop)
				;

				if (!entries) return null;
				return new Collection(entries);
			} catch(err) {
				console.error(`[ MODAL-ERROR : ${Date.timestamp()} ]`, err);
				return null;
			}
		}
	}
}

// MARK: DiscordMenu
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

    this.sendOption = { ephemeral: ValidateBoolean(options.ephemeral, null) };
    this.ephemeral = ValidateBoolean(options.ephemeral, null);
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
    if (!this.element) throw new BotTypeError("WrongType", 'element', ["Message", "CommandInteraction"]);
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

	async #processComponents_v1(array) {
		this.actions = {};

		const NonEmpty = (e) => isArray(e) ? e.length > 0 : e;

		const processComponent = ( data ) => { // Component processor.
			let uid = this.sid.random();
			this.actions[uid] = data.action ?? null;

			if (typeof data.disabled === 'function') {
				data.disabled = data.disabled.call(this, { pages: this.pages, page: this.page, index: this.pageIndex }) ?? false;
			}

			return Object.assign(Object.assign({ type: ComponentType.Button, style: ButtonStyle.Secondary }, { ...data }), { customId: this.uid +':'+ uid });
		}

		const processComponents = async ( element ) => { // Main brain for processing each element.
			if (typeof element === 'function') {
				element = await element.call(this, { pages: this.pages, page: this.page, index: this.pageIndex });
			}

			if (Array.isArray(element)) { // Array² of components
				if (element.some(Array.isArray)) {
					return await Promise.all(element.filter(NonEmpty).flatMap(async ( element ) => {
						return await processComponents(element);
					}));
				} else { // Array of components
					return { // Return an action row with processed components.
						type: ComponentType.ActionRow,
						components: element.filter(NonEmpty).flatMap(e => processComponent(e)),
					}
				}
			}

			if (element.type === ComponentType.ActionRow ) { // Is an ActionRow component
				return Object.assign({...element}, { components: element?.components.filter(NonEmpty).map(processComponent) });
			}

			return element;
		}

		let elements = typeof array == 'function' ? await array.call(this, { pages: this.pages, page: this.page, index: this.pageIndex }) : array;
		if (!elements) return [];

		let components = await Promise.all(elements?.filter(NonEmpty).map(processComponents));
		return components.flat();
	}
	async #processComponents(array) {
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
				let uid = this.sid.random();
				this.actions[uid] = data.action ?? null;

				if (typeof data.disabled === 'function') {
					data.disabled = data.disabled.call(this, { pages: this.pages, page: this.page, index: this.pageIndex }) ?? false;
				}

				return {
					type: ComponentType.Button,
					style: ButtonStyle.Secondary,
					...data,
					customId: `${this.uid}:${uid}`
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
		// console.inspect(finalComponents);

		return finalComponents.flat().filter(selfnoop);
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

	async handleError(error) {
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
				{ name: "randomfox.ca", fn: FetchFoxImageAPI }
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

			if (this.element instanceof CommandInteraction) {
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
		return await this.#processComponents(this.page?.components) ?? [];
	}

	async prepareMessage(O) {
		const [components, content, embeds, files] = await Promise.all([
			this._prepareMessageComponents(O),
			this._prepareMessageContent(O),
			this._prepareMessageEmbeds(O),
			this._prepareMessageFiles(O)
		]);

		const flags = [];

		const hasV2 = components.some(c => 
			[ComponentType.Container, ComponentType.TextDisplay, ComponentType.MediaGallery].includes(c.type)
		);

		if (hasV2) flags.push(MessageFlags.IsComponentsV2);
		if (this.ephemeral) flags.push(MessageFlags.Ephemeral);


		return hasV2 ? { components, files, flags } : { content, components, embeds, files, flags };
	}

	async runHook(parent, hookName, args = {}) {
		let hook = parent[hookName];
		if (typeof hook === 'function') {
			try {
				await hook.call(this, args);
			} catch (err) {
				await this.handleError(err);
			}
		}
	}

	async send(OPTIONS = {}) {
		if (this.sent) throw new BotError("This menu is already sent.");

		try {
			this.uid = this.element.id +'_'+ Date.timestamp();

			let _beforeUpdate = await this.runHook(this, 'beforeUpdate', {});
			if (_beforeUpdate) return;

			let _pageBeforeUpdate = await this.runHook(this.page, 'beforeUpdate', {});
			if (_pageBeforeUpdate) return;

			let payload = await this.prepareMessage(OPTIONS);

			if ( this.element instanceof Message ) {
				this.message = await this.element.reply(payload);
			}

			if ( this.element instanceof CommandInteraction ) {
				this.message = await this.element.reply(payload);
			}

			if (this.message) {
				this.sent = true;
			}

			this.collector = null;

			let _afterUpdate = await this.runHook(this, 'afterUpdate', {});
			if (_afterUpdate) return;

			let _pageafterUpdate = await this.runHook(this.page, 'afterUpdate', {});
			if (_pageafterUpdate) return; // useless but, yes.
		} catch (error) {
			await this.handleError(error);
		}
	}

	async update(OPTIONS = {}) {
		if (this.collector.ended) return;
		if (!this.page) return;

		try {
			let _beforeUpdate = await this.runHook(this, 'beforeUpdate', OPTIONS);
			if (_beforeUpdate) return;

			let _pageBeforeUpdate = await this.runHook(this.page, 'beforeUpdate', OPTIONS);
			if (_pageBeforeUpdate) return;

			let { content, components, embeds, files } = await this.prepareMessage();

			if ( this.element instanceof Message ) await this.message.edit({content, components, embeds, files, attachments: []});
			if ( this.element instanceof CommandInteraction ) await this.element.editReply({content, components, embeds, files, attachments: []});

			let _afterUpdate = await this.runHook(this, 'afterUpdate', OPTIONS);
			if (_afterUpdate) return;

			let _pageafterUpdate = await this.runHook(this.page, 'afterUpdate', OPTIONS);
			if (_pageafterUpdate) return; // useless but, yes.
		} catch (error) {
			await this.handleError(error);
		}
	}

	ignoreDefaultCollectOnce() {
		this._ignoreDefaultCollectOnce = true;
	}
	ignoreDefaultCollectFilterOnce() {
		this._ignoreDefaultCollectFilterOnce = true;
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
								interaction.deferUpdate().catch(noop);

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
								}

								// Sécurité de range des pages
								this.pageIndex = Math.clamp(this.pageIndex, 0, this.pages.lastIndex);
								// OLD // TO DELETE
								// if (this.pageIndex > this.pages.length - 1) this.pageIndex = this.pages - 1;
								// if (this.pageIndex < 0) this.pageIndex = 0;

								if (stillUpdate) await this.update({ client, interaction });
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

				if (this.useDefaultEnd ?? true) {
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
			await this.handleError(error);
		}
	}
}