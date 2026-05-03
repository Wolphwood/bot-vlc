import { PERMISSION, SOP_PERMISSION } from "#constants";
import { dbManager } from "#modules/database/Manager";
import Emotes from "#modules/Emotes";
import { ExtractUrlsFromContent, ExtractUrlsFromAttachments, SaveUrlToLocal, MD5, ModalForm, noop, isString, ValidateArray, selfnoop, deleteAfter, uncachedImport } from "#modules/Utils";
import { ButtonStyle, ComponentType } from "discord.js";

const { GetCachedOutfitAttachment, GetCachedOutfitAttachmentPreview, GetNavBar, NumerotedListToColumns, SortByName } = await uncachedImport("../../shared.js");

export default [
  {
    name: "settings-character",
    beforeUpdate: function() {
      if (!this.data._settings._character) {
        this.data._settings._character = {
          grp: { page: 0, navspeed: 0, pages: [] },
          chr: { page: 0, navspeed: 0, pages: [], delete: 0, deltm: null },
        }
      };

      let sttgs = this.data._settings._character;

      sttgs.grp.mapped = {}
      this.data.groups.forEach(group => sttgs.grp.mapped[group.slug] = group);

      sttgs.grp.pages = this.data.groups.filter(g => g.hasAny([ SOP_PERMISSION.MANAGE_GRP, SOP_PERMISSION.EDIT_CHAR, SOP_PERMISSION.ADD_CHAR ])).chunkOf(25);

      sttgs.chr.pages = this.data.characters.filter(character => {
        if (this.data.userPermission >= PERMISSION.ADMIN) return true;
        if (character.rules.owner === this.element.member.id) return true;
        return sttgs.grp.mapped[character.group_slug]?.can(SOP_PERMISSION.EDIT_CHAR);
      }).chunkOf(25);
    },
    components: function() {
      let sttgs = this.data._settings._character;
      const displayOptions = this.data.displayOptions;
      let nav = sttgs.slug ? sttgs.chr : sttgs.grp;
      let group = this.data.groups.find(group => group.slug == sttgs.slug);

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# Configuration du Smash or Pass",
            !sttgs.slug && [
              "## Veuillez selectionner un groupe",
              (sttgs.grp.pages.length === 0) ? "- Aucun groupe à afficher." :
              NumerotedListToColumns(sttgs.grp.pages[sttgs.grp.page].map((group, index) => `${(index+1)+(sttgs.grp.page*25)}. ${group.name}`.limit(40)), displayOptions.numberOfColumn)
            ],
            (sttgs.slug && !sttgs.character) && [
              "## Veuillez ajouter ou selectionner un personnage",
              "### Une fois sélectionner, pour revenir à cette vue, vous pouvez le déselectionner",
              "Une fois selectionner, appuyez sur `modifier` pour configurer ses arcs narratifs et ses tenues",
              (sttgs.chr.pages.length === 0) ? "- Aucun personnage à afficher." :
              NumerotedListToColumns(sttgs.chr.pages[sttgs.chr.page].map((character, index) => `${(index+1)+(sttgs.chr.page*25)}. ${character.name}`.limit(40)), displayOptions.numberOfColumn)
            ],
            sttgs.character && [
              `## ${sttgs.character.name}`,
              sttgs.character.rules?.owner && `### Personnage créer par <@${sttgs.character.rules?.owner}>`,
              "Une fois selectionner, appuyez sur `modifier` pour configurer ses arcs narratifs et ses tenues"
            ],
            
            (!sttgs.character && nav.pages.length > 1) && [
              `\nVitesse de navigation : ±${[1,5,10][nav.navspeed]} | Page ${nav.page+1}/${nav.pages.length}`
            ],
          ].flat().filter(isString),
          '.---',
          [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionner un groupe",
              min_values: 0, max_values: 1,
              options: sttgs.grp.pages[sttgs.grp.page]?.map((group, index) => ({
                label: `${(index+1)+(sttgs.grp.page*25)}. ${group.name}`,
                value: group.slug,
                default: group.slug == sttgs.slug,
              })) ?? [{ label: "Aucun groupe a afficher", value: "none", default: true }],
              disabled: !sttgs.grp.pages[sttgs.grp.page],
              action: async function({interaction}) {
                sttgs.slug = interaction.values[0];
                sttgs.character = null;
                const characters = await dbManager.SOP.character.getAll(sttgs.slug);
                this.data.characters = characters.sort(SortByName);
                return true;
              },
            }
          ],
          sttgs.slug ? [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionner un personnage",
              min_values: 0, max_values: 1,
              options: sttgs.chr.pages[sttgs.chr.page]?.map((character, index) => ({
                label: `${(index+1)+(sttgs.chr.page*25)}. ${character.name}`,
                value: character.uid,
                default: character.uid == sttgs.character?.uid,
              })) ?? [{ label: "Aucun personnage a afficher", value: "none", default: true }],
              disabled: !sttgs.chr.pages[sttgs.chr.page],
              action: function({interaction}) {
                sttgs.character = sttgs.chr.pages[sttgs.chr.page].find(c => c.uid == interaction.values[0]);
                return true;
              },
            }
          ] : null,

          !sttgs.slug
            ? sttgs.grp.pages.length > 1 ? [ GetNavBar(sttgs.grp) ] : null
            : !sttgs.character && sttgs.chr.pages.length > 1 ? [ GetNavBar(sttgs.chr) ] : null
          ,

          sttgs.slug ? [
            {
              label: "Ajouter un personnage",
              disabled: !!sttgs.character,
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Nommer le personnage", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: interaction.member.displayName })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                let createdchar = await dbManager.SOP.character.create({
                  group_slug: sttgs.slug,
                  name: result.get('name'),
                  rules: {
                    owner: interaction.member.id
                  },
                }).catch(e => console.error(e));

                if (!createdchar) return false;

                this.data.characters.push(createdchar);
                sttgs.character = createdchar;

                return true;
              },
            },
            {
              label: "Modifier le personnage",
              disabled: !sttgs.character,
              action: "goto:settings-character-edit",
            },
            {
              label: ["Supprimer le personnage", 'Sûr ?', 'CERTAIN·E ??'][sttgs.chr.delete],
              style: [ButtonStyle.Secondary, ButtonStyle.Primary, ButtonStyle.Danger][sttgs.chr.delete],
              disabled: !sttgs.character,
              action: function() {
                if (sttgs.chr.deltm) clearTimeout(sttgs.chr.deltm);

                if (sttgs.chr.delete < 2) {
                  sttgs.chr.delete++;

                  sttgs.chr.deltm = setTimeout(() => {
                    sttgs.chr.delete = 0;
                    this.update();
                  }, 5000);

                } else {
                  this.data.characters.splice(this.data.characters.findIndex(c => c.uid == sttgs.character.uid), 1);
                  dbManager.SOP.character.delete(sttgs.character.uid);
                  
                  sttgs.chr.delete = 0;
                  sttgs.character = null;
                }
                return true;
              },
            },
          ] : null,

          [
            {
              emoji: '👈',
              label: "Retour",
              style: ButtonStyle.Secondary,
              action: function() {
                delete this.data._settings._character;
                this.goto("settings");
                return true;
              },
            },
          ]
        ]
      }];
    }
  },
  {
    name: "settings-character-edit",
    beforeUpdate: async function() {
      if (!this.data._settings._character._edit) {
        this.data._settings._character._edit = {
          character: this.data._settings._character.character,
          arc: null, outfit: null,
          arcs: { mapped: {}, page: 0, navspeed: 0, pages: [], delete: 0, deltm: null },
          outfits: { mapped: {}, page: 0, navspeed: 0, pages: [], delete: 0, deltm: null },
        }
      }

      let sttgs = this.data._settings._character._edit;
      
      sttgs.arcs.mapped = {};
      sttgs.character.arcs.forEach(arc => sttgs.arcs.mapped[arc.id] = arc);
      
      sttgs.outfits.mapped = {};
      sttgs.character.outfits.forEach(outfit => sttgs.outfits.mapped[outfit.id] = outfit);

      sttgs.arcs.pages = sttgs.character.arcs.chunkOf(25);
      sttgs.outfits.pages = sttgs.character.outfits.chunkOf(25);


      sttgs.attachments = [];
      
      if (sttgs.outfit) {
        sttgs.attachments.push(GetCachedOutfitAttachment(sttgs.outfit));
      } else if (sttgs.mode === "outfits") {
        sttgs.attachments = await Promise.all(sttgs.character.outfits.toSorted(() => Math.random() > 0.5 ? 1 : -1).slice(0,9).map(outfit => GetCachedOutfitAttachmentPreview(outfit)));
      }
    },
    files: function() {
      let sttgs = this.data._settings._character._edit;
      return sttgs.attachments;
    },
    components: function() {
      let sttgs = this.data._settings._character._edit;
      const displayOptions = this.data.displayOptions;

      let btns = { arcs: "Arcs narratif", outfits: "Tenues", settings: "Paramètres" };

      const COMPS = [
        btns.entries().map(([key, label]) => ({
          label,
          style: sttgs.mode == key ? ButtonStyle.Primary : ButtonStyle.Secondary,
          action: function() {
            sttgs.arcs.page = 0;
            sttgs.outfits.page = 0;

            sttgs.arc = null;
            sttgs.outfit = null;

            if (sttgs.mode == key) {
              sttgs.mode = null;
            } else sttgs.mode = key;
            return true;
          },
        })),
      ];

      const UpdateCharacter = (data) => {
        sttgs.character = data;
        let cindex = this.data.characters.findIndex(c => c.uid == data.uid);
        if (cindex >= 0) this.data.characters[cindex] = sttgs.character;
      }
      
      switch (sttgs.mode) {
        case "arcs": {
          // Arc Select
          COMPS.push([
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionner un arc narratif",
              min_values: 0, max_values: 1,
              options: sttgs.arcs.pages[sttgs.arcs.page]?.map((arc, index) => ({
                label: `${(index+1)+(sttgs.arcs.page*25)}. ${arc.name}`,
                value: arc.id,
                default: arc.id == sttgs.arc?.id,
              })) ?? [{ label: "Aucun arc narratif a afficher", value: "none" }],
              disabled: !sttgs.arcs.pages[sttgs.arcs.page],
              action: function({interaction}) {
                sttgs.arc = sttgs.arcs.mapped[ interaction.values[0] ];
                sttgs.outfit = null;
                return true;
              },
            }
          ]);
          
          // Arc NavBar
          if (!sttgs.arc) {
            if (!sttgs.outfit && sttgs.arcs.pages.length > 1) COMPS.push([ GetNavBar(sttgs.arcs) ]);
          }

          // Action Buttons (Arc)
          COMPS.push([
            {
              label: "Ajouter un arc",
              disabled: !!sttgs.arc,
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Nommer l'arc narratif", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom de l'arc narratif", placeholder: "Nom de fou furieux" })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                let updated = await dbManager.SOP.character.updateArc(sttgs.character.uid, {
                  id: result.get('name').toLowerCase().simplify().replace(/\s+/gi, '-'),
                  name: result.get('name'),
                });

                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: "Renommer l'arc",
              disabled: !sttgs.arc,
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Nommer l'arc narratif", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom de l'arc narratif", placeholder: "Nom de fou furieux", value: sttgs.arc.name })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                let updated = await dbManager.SOP.character.updateArc(sttgs.character.uid, sttgs.arc);

                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: ["Supprimer l'arc", 'Sûr ?', 'CERTAIN·E ??'][sttgs.arcs.delete],
              style: [ButtonStyle.Secondary, ButtonStyle.Primary, ButtonStyle.Danger][sttgs.arcs.delete],
              disabled: !sttgs.arc,
              action: async function() {
                if (sttgs.arcs.deltm) clearTimeout(sttgs.arcs.deltm);

                if (sttgs.arcs.delete < 2) {
                  sttgs.arcs.delete++;

                  sttgs.arcs.deltm = setTimeout(() => {
                    sttgs.arcs.delete = 0;
                    this.update();
                  }, 5000);
                } else {
                  let updated = await dbManager.SOP.character.removeArc(sttgs.character.uid, sttgs.arc);
                  if (updated) UpdateCharacter(updated);
                  sttgs.arcs.delete = 0;
                  sttgs.arc = null;
                }
                return true;
              },
            },
          ]);
          COMPS.push([
            {
              label: "Changer la description",
              disabled: !sttgs.arc,
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Décrire la tenue", time: 120_000 })
                  .addRow().addParagraphField({ name: 'description', label: "Description de la tenue", placeholder: "Ajouter une description (laissez vide pour supprimer)", value: sttgs.arc?.description, required: false, max_length: 1000 })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result) return false;
                
                let description = result.get('description');
                sttgs.arc.description = description || null;

                let updated = await dbManager.SOP.character.updateArc(sttgs.character.uid, sttgs.arc);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
          ]);
          break;
        }

        case "outfits": {
          // Outfit Select
          COMPS.push([
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionner un outfit",
              min_values: 0, max_values: 1,
              options: sttgs.outfits.pages[sttgs.outfits.page]?.map((outfit, index) => {
                const arc = sttgs.arcs.mapped[outfit.arc];
                
                return {
                  label: `${(index + 1) + (sttgs.outfits.page * 25)}. ${outfit.name}` + (arc ? ` (${arc.name})` : ''),
                  value: outfit.id,
                  default: outfit.id === sttgs.outfit?.id,
                }
              }) ?? [{ label: "Aucun outfit a afficher", value: "none", default: true }],
              disabled: !sttgs.outfits.pages[sttgs.outfits.page],
              action: function({interaction}) {
                sttgs.outfit = sttgs.outfits.mapped[interaction.values[0]];
                sttgs.outfits.delete = 0;
                clearTimeout(sttgs.outfits.deltm);
                return true;
              },
            }
          ]);
          
          // Outfit NavBar
          if (!sttgs.outfit) {
            if (sttgs.outfits.pages.length > 1) COMPS.push([ GetNavBar(sttgs.outfits) ]);
          } else {
            // arc S(outfit change arc)
            COMPS.push([
              {
                type: ComponentType.StringSelect,
                placeholder: "Selectionner un arc narratif",
                min_values: 0, max_values: 1,
                options: sttgs.arcs.pages[sttgs.arcs.page]?.map((arc,index) => ({
                  label: `${(index+1)+(sttgs.arcs.page*25)}. ${arc.name}`,
                  value: arc.id,
                  default: arc.id == sttgs.outfit.arc,
                })) ?? [{ label: "Aucun arc narratif a afficher", value: "none", default: true }],
                disabled: !sttgs.arcs.pages[sttgs.arcs.page],
                action: async function({interaction}) {
                  sttgs.outfit.arc = interaction.values[0];
                  
                  let updated = await dbManager.SOP.character.updateOutfit(sttgs.character.uid, sttgs.outfit);
                  if (!updated) return false;
                  
                  UpdateCharacter(updated);
                  
                  return true;
                },
              }
            ]);
          }

          // Action Button (Outfits)
          COMPS.push([
            {
              label: "Ajouter des outfits",
              action: async function({ interaction }) {
                if (sttgs.pendingImageUploading) return false;
                interaction.deferUpdate();
                
                const filter = (collect) => {
                  if (interaction.user.id !== collect.author.id) return false;
                  return /\bcancel\b/gmi.test(collect.content) || ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                }
                
                let instruction = await interaction.channel.send({
                  content: `${interaction.user} Envoyez un message contenant des liens et/ou des images attachées.\nEcrit \`cancel\` pour annuler.\n_Annulation automatique <t:${ Date.timestamp() + 130 }:R>_`
                });
                sttgs.pendingImageUploading = true;
                let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(selfnoop).catch(noop);
                instruction.delete().catch(noop);
                sttgs.pendingImageUploading = false;
                
                if (collected) {
                  await collected.values().array().map(async (message) => {
                    let toprocess = message;
                    if (toprocess.reference) {
                      try {
                        let ref = await toprocess.fetchReference();
                        if (ref) toprocess = ref;
                      } catch (err) {
                        console.error(err);
                      }
                    }

                    await toprocess.react(Emotes.loading).catch(noop);

                    for (let url of [...ExtractUrlsFromContent(toprocess), ...ExtractUrlsFromAttachments(toprocess)]) {
                      if (!url) continue;

                      let name = `${sttgs.character.uid}_${MD5(url)}`;
                      let filename = await SaveUrlToLocal(url, './assets/sop/outfits/', name);

                      if (filename) {
                        sttgs.character.outfits.push({
                          name: `New Outfit #${name.slice(-4)}`,
                          filename,
                        });
                      }
                    }

                    await toprocess.delete().catch(noop);
                  }).promise();
                }

                let updated = await dbManager.SOP.character.addOutfits(sttgs.character.uid, sttgs.character.outfits).catch(e => console.error(e));
                if (!updated) return false;
                
                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: "Renommer l'outfit",
              disabled: !sttgs.outfit,
              action: async function({ interaction }) {
                 let modal = new ModalForm({ title: "Nommer le personnage", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom de la tenue", placeholder: sttgs.outfit.name, value: sttgs.outfit.name })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                const was = { name: sttgs.outfit.name, arc: sttgs.outfit.arc };
                sttgs.outfit.name = result.get('name');

                let updated = await dbManager.SOP.character.updateOutfit(sttgs.character.uid, sttgs.outfit, was);

                if (!updated) return false;

                UpdateCharacter(updated);

                return true
              }
            },
            {
              label: ["Supprimer l'outfit", 'Sûr ?', 'CERTAIN·E ??'][sttgs.outfits.delete],
              style: [ButtonStyle.Secondary, ButtonStyle.Primary, ButtonStyle.Danger][sttgs.outfits.delete],
              disabled: !sttgs.outfit,
              action: async function() {
                if (sttgs.outfits.deltm) clearTimeout(sttgs.outfits.deltm);

                if (sttgs.outfits.delete < 2) {
                  sttgs.outfits.delete++;

                  sttgs.outfits.deltm = setTimeout(() => {
                    sttgs.outfits.delete = 0;
                    this.update();
                  }, 5000);
                } else {
                  let updated = await dbManager.SOP.character.removeOutfit(sttgs.character.uid, sttgs.outfit);
                  UpdateCharacter(updated);
                  sttgs.outfits.delete = 0;
                  sttgs.outfit = null;
                }
                return true;
              },
            },
          ],
          [
            {
              label: "Changer d'image",
              disabled: !sttgs.outfit,
              action: async function({ interaction }) {
                if (sttgs.pendingImageUploading) return false;
                interaction.deferUpdate();
                
                const filter = (collect) => {
                  if (interaction.user.id !== collect.author.id) return false;
                  return /\bcancel\b/gmi.test(collect.content) || ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                }
                
                // Ask for images
                let instruction = await interaction.channel.send({
                  content: `${interaction.user} Envoyez un message contenant un lien ou une image attachée.\nEcrit \`cancel\` pour annuler.\s_Annulation automatique <t:${ Date.timestamp() + 130 }:R>_`
                });
                sttgs.pendingImageUploading = true;
                let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(selfnoop).catch(noop);
                instruction.delete().catch(noop);
                sttgs.pendingImageUploading = false;

                if (!collected) return false;

                // Get only the first
                let toprocess = collected.values().array()[0];
                if (!toprocess) return false;
                
                await toprocess.react(Emotes.loading).catch(noop);

                // Fetch teh reference if transfered
                if (toprocess.reference) {
                  try {
                    let ref = await toprocess.fetchReference();
                    if (ref) toprocess = ref;
                  } catch (err) {
                    console.error(err);
                  }
                }

                // Get all links and get only one
                let links = [...ExtractUrlsFromContent(toprocess), ...ExtractUrlsFromAttachments(toprocess)];
                let url = links[0];

                if (!url) return false;

                // taunt if multiple links
                if (links.length > 1) {
                  interaction.channel.send(`${interaction.user} J'avais dis une image... ${Emotes.catrage}\nSeule la première sera prise en compte du coup 🖕`).then(m => deleteAfter(m, 5_000));
                }

                // Download Image & Update outfit 
                let name = `${sttgs.character.uid}_${MD5(url)}`;
                let filename = await SaveUrlToLocal(url, './assets/sop/outfits/', name);

                toprocess.delete().catch(noop);

                sttgs.outfit.filename = filename;
                
                let updated = await dbManager.SOP.character.updateOutfit(sttgs.character.uid, sttgs.outfit);
                if (!updated) return false;
                
                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: "Crediter l'artiste",
              disabled: !sttgs.outfit,
              action: async function({ interaction }) {
                 let modal = new ModalForm({ title: "Nommer le personnage", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom de l'artiste", placeholder: "Laisse vide pour ne ne rien mettre", value: sttgs.outfit.artist?.name, required: false })
                  .addRow().addTextField({ name: 'link', label: "Lien de l'artiste", placeholder: "Laisse vide pour ne ne rien mettre", value: sttgs.outfit.artist?.link, required: false })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();

                if (!result) return false;
                
                if (!sttgs.outfit.artist) sttgs.outfit.artist = {};

                let name = result.get('name');
                sttgs.outfit.artist.name = name || null;

                let link = result.get('link');
                sttgs.outfit.artist.link = link ? /^https+:\/\//gmi.test(link) ? link : `https://${link}` : null;
                
                let updated = await dbManager.SOP.character.updateOutfit(sttgs.character.uid, sttgs.outfit);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true
              }
            },
            {
              label: "Changer la description",
              disabled: !sttgs.outfit,
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Décrire la tenue", time: 120_000 })
                  .addRow().addParagraphField({ name: 'description', label: "Description de la tenue", placeholder: "Ajouter une description (laissez vide pour supprimer)", value: sttgs.outfit.description, required: false, max_length: 1000 })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result) return false;
                
                sttgs.outfit.description = result.get('description') || null;

                let updated = await dbManager.SOP.character.updateOutfit(sttgs.character.uid, sttgs.outfit);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
          ]);
          break;
        }

        case "settings": {
          COMPS.push([
            {
              label: "Renommer le personnage",
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Nommer le personnage", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom du personnage", placeholder: sttgs.character.name, value: sttgs.character.name })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;
                
                let updated = await dbManager.SOP.character.setName(sttgs.character.uid, result.get('name'));
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: "Changer la description",
              action: async function({ interaction }) {
                let modal = new ModalForm({ title: "Décrire le personnage", time: 120_000 })
                  .addRow().addParagraphField({ name: 'description', label: "Description du personnage", placeholder: "Ajouter une description (laissez vide pour supprimer)", value: sttgs.character.description, required: false, max_length: 1000 })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result) return false;
                
                let updated = await dbManager.SOP.character.setDescription(sttgs.character.uid, result.get('description'));
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            // {
            //   label: "Transférer dans un autre groupe. (wip)",
            //   disabled: true,
            //   action: function() {},
            // },
            // {
            //   label: "Copier dans un autre groupe. (wip)",
            //   disabled: true,
            //   action: function() {},
            // },
          ]);
          COMPS.push([
            {
              label: sttgs.character.rules.can_be_smash ? "Rendre Non Smashable" : "Rendre Smashable",
              style: sttgs.character.rules.can_be_smash ? ButtonStyle.Success : ButtonStyle.Danger,
              disabled: this.data.userPermission < PERMISSION.ADMIN,
              action: async function() {
                let updated = await dbManager.SOP.character.setSmashable(sttgs.character.uid, !sttgs.character.rules.can_be_smash);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: sttgs.character.rules.can_be_pass ? "Est Passable" : "N'est pas Passable",
              style: sttgs.character.rules.can_be_pass ? ButtonStyle.Success : ButtonStyle.Danger,
              disabled: this.data.userPermission < PERMISSION.ADMIN,
              action: async function() {
                let updated = await dbManager.SOP.character.setPassable(sttgs.character.uid, !sttgs.character.rules.can_be_pass);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
          ]);
          COMPS.push([
            {
              label: sttgs.character.rules.can_be_smash ? "Est Super Smashable" : "N'est pas Smashable",
              style: sttgs.character.rules.can_be_smash ? ButtonStyle.Success : ButtonStyle.Danger,
              disabled: this.data.userPermission < PERMISSION.ADMIN,
              action: async function() {
                let updated = await dbManager.SOP.character.setSuperSmashable(sttgs.character.uid, !sttgs.character.rules.can_be_smash);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: sttgs.character.rules.can_be_pass ? "Est Super Passable" : "N'est pas Super Passable",
              style: sttgs.character.rules.can_be_pass ? ButtonStyle.Success : ButtonStyle.Danger,
              disabled: this.data.userPermission < PERMISSION.ADMIN,
              action: async function() {
                let updated = await dbManager.SOP.character.setSuperPassable(sttgs.character.uid, !sttgs.character.rules.can_be_pass);
                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
          ]);
          break;
        }
      }

      const GALLERIES = sttgs.attachments.length === 0 ? [] : sttgs.attachments.chunkOf(10).map(attachments => {
        return {
          type: ComponentType.MediaGallery,
          items: attachments.map(attachment => ({ media: { url: `attachment://${attachment.name}` } }))
        }
      });

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# Gestion du personnage.",
            `# ${sttgs.character.name}`,
            !sttgs.mode && "Ici tu peux modifier les arcs narratifs, les tenues ect...",
            
            // ARCS
            sttgs.mode === "arcs" && [
              [
                "## 📖 Qu'est-ce qu'un Arc Narratif ?",
                "Un **Arc Narratif** représente un chapitre majeur de l'histoire du personnage.",
                "Il marque un moment charnière qui transforme son caractère ou ses objectifs.",
                "Un nouvel arc s'accompagne souvent d'un nouveau look (tenue, coiffure, cicatrices).",
                "Sa psychologie et son état d'esprit ne sont plus les mêmes qu'auparavant.",
                "_En résumé : Nouveau chapitre, nouvelle version de soi._",
                "",
                `${sttgs.character.name} possède actuellement ${sttgs.character.arcs.length} arcs narratif(s)`,
              ],
              sttgs.arc && sttgs.arc?.description && [
                `### Description de l'arc narratif (${sttgs.arc.description.length}/1000)\n` + sttgs.arc.description.limit(1000),
              ],
              (!sttgs.arc && ValidateArray(sttgs.arcs.pages[sttgs.arcs.page], []).length > 0) && [
                NumerotedListToColumns(sttgs.arcs.pages[sttgs.arcs.page]?.map((arc, index) => `${(index+1)+(sttgs.arcs.page*25)}. ${arc.name}`.limit(30)), displayOptions.numberOfColumn),
              ],
              sttgs.arcs.pages.length > 1 ? `-# Vitesse de navigation : ±${[1,5,10][sttgs.arcs.navspeed]} | Page ${sttgs.arcs.page+1}/${sttgs.arcs.pages.length}` : "",
            ].flat(),

            // OUTFITS
            sttgs.mode === "outfits" && [
              !sttgs.outfit && [
                "## 👕 Qu'est-ce qu'une Tenue (Outfit) ?",
                "Une **Tenue** définit l'apparence visuelle de votre personnage à un instant donné.",
                "Contrairement à l'Arc qui définit une période, la Tenue est un élément de personnalisation immédiat.",
                "Lier une tenue à un **Arc Narratif** permet de filtrer automatiquement les styles cohérents avec l'évolution du personnage.",
                "Par exemple : une armure lourde pour un arc de guerre, ou une tenue civile pour un arc de repos.",
                "Vous pouvez posséder plusieurs tenues par arc (tenue de nuit, tenue de combat, etc.) pour adapter votre look au contexte de votre RP.",
                "",
                `${sttgs.character.name} possède actuellement ${sttgs.character.outfits.length} tenue(s) au total.`,
              ],
              sttgs.outfit && sttgs.outfit?.description && [
                `### Description de la tenue (${sttgs.outfit.description.length}/1000)\n` + sttgs.outfit.description.limit(1000),
              ],
              sttgs.outfit && [
                `## ${sttgs.outfit.name}`,
                sttgs.outfit.arc && `### Arc: ${sttgs.arc?.name || 'Arc inconnu'}`,
                sttgs.outfit.artist.name && "Visuel créer par " + (sttgs.outfit.artist.link ? `[${sttgs.outfit.artist.name}](${sttgs.outfit.artist.link})` : sttgs.outfit.artist.name),
                "",
              ],
              (!sttgs.outfit && ValidateArray(sttgs.outfits.pages[sttgs.outfits.page], []).length > 0) && [
                NumerotedListToColumns(sttgs.outfits.pages[sttgs.outfits.page]?.map((outfit, index) => {
                  return `${(index+1)+(sttgs.outfits.page*25)}. ${outfit.name}`.limit(30);
                }), displayOptions.numberOfColumn),
              ],
            ].flat(),

            // SETTINGS
            sttgs.mode === "settings" && [
              "## Paramètres généraux",
              `**Propriétaire**: <@${sttgs.character.rules.owner}>`,
              `**Est smashable**: ${sttgs.character.rules.can_be_smash ? 'Oui' : 'Non'}`,
              `**Est passable**: ${sttgs.character.rules.can_be_pass ? 'Oui' : 'Non'}`,
              `**Descrition**: ${sttgs.character.description ? `${sttgs.character.description.length} caractères` : 'Aucune'}`
            ].flat(),
          ].flat().filter(isString),
          
          // Galleries
          ...GALLERIES,

          sttgs.mode === "outfits" && "**AVANT DE CLIQUER SUR 'AJOUTER' PRÉPAREZ VOS IMAGES PRÊT À GLISSER/DÉSPOSER**",

          // TIPS
          [
            "-# Tips: Les arcs narratifs sont optionels",
            "-# Tips: Désélectionner un arc permet de revenir à la vue d'ensemble du personnage.",
            "-# Tips: Utilise les flèches de navigation pour parcourir tes arcs si tu en as beaucoup.",
            "-# Tips: Tu peux modifier le nom d'un arc à tout moment sans perdre les tenues associées.",
            "-# Tips : Pour un saut dans le temps (Timeskip), créer un nouvel arc est la solution idéale.",
            "-# Tips : Les arcs servent aussi à définir le 'Mood' par défaut de votre personnage.",
          ].getRandomElement(),
          `-# ${ sttgs.character.uid } | ${sttgs.character.name || 'Never Gonna Give You Up'}`,
          '.---',
          ...COMPS,
          [
            {
              emoji: '👈',
              label: "Retour",
              style: ButtonStyle.Secondary,
              action: function() {
                if (sttgs.arcs.deltm) clearTimeout(sttgs.arcs.deltm);
                if (sttgs.outfits.deltm) clearTimeout(sttgs.outfits.deltm);
                
                delete this.data._settings._character._edit;

                this.goto("settings-character");
                return true;
              },
            },
          ]
        ]
      }];
    }
  }
];