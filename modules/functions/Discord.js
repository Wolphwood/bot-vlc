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
				console.error(`[ MODAL-ERROR : ${Date.timestamp()} ]`, err);
        		return null;
			}
		}
	}
}
