import { Registry } from '#modules/Registry';

import {
	ComponentType, ButtonStyle, TextInputStyle,
	Collection,
} from 'discord.js';

import { noop, isFunction } from "#modules/Utils";

Registry.register({
  name: "Discord Modal Form",
  group: "utils",
  version: "1.2",
  details: [
    "ModalForm",
  ]
});

export class ModalForm {
	#onErrorCallback;

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

	addTextField({ name, label, placeholder, value, required, row, min_length, max_length } = {}) { // Add short text field
		if (row == undefined) row = this.components.length - 1;
		this.components[row].components.push({
			type: ComponentType.TextInput,
			name: name ?? 'text',
			label: label ?? 'Short Text Field',
			placeholder: placeholder ?? '\u200b',
			style: TextInputStyle.Short,
			min_length, max_length,
			value, required
		});
		return this;
	}

	addParagraphField({ name, label, placeholder, value, required, row, min_length, max_length } = {}) { // Add short text field
		if (row == undefined) row = this.components.length - 1;
		this.components[row].components.push({
			type: ComponentType.TextInput,
			name: name ?? 'paragraph',
			label: label ?? 'Short Text Field',
			placeholder: placeholder ?? '\u200b',
			style: TextInputStyle.Paragraph,
			min_length, max_length,
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

	onError(cb) {
		this.#onErrorCallback = isFunction(cb) ? cb : null;
		return this;
	}

	handleError(err) {
		if (typeof this.#onErrorCallback === 'function') this.#onErrorCallback(err, this.interaction);
    return null;
  };

	async popup() {
		if (this.interaction.deferred || this.interaction.replied) {
			return this.handleError(new Error("Interaction déjà acquittée."));
		}

		const modal = this.#buildModal();

		try {
			await this.interaction.showModal(modal);

			const filter = async (interaction) => {
				if (interaction.customId === modal.custom_id) {
					await interaction.deferUpdate().catch(noop);
					return true;
				}
				return false;
			}

			const submitted = await this.interaction.awaitModalSubmit({ filter, time: this.time });
			const entries = submitted.fields.fields.map((k, v) => [v.split(':')[1], k.value]);
			
			return new Collection(entries);
		} catch(err) {
			if (err.code === 'InteractionCollectorError') return null;
			return this.handleError(err);
		}
	}
}