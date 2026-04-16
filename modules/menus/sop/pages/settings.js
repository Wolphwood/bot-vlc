import { PERMISSION, SOP_PERMISSION } from "#constants";
import { dbManager } from "#modules/database/Manager";
import Emotes from "#modules/Emotes";
import { ExtractUrlsFromContent, ExtractUrlsFromAttachments, SaveUrlToLocal, MD5, ModalForm, noop, isString, ValidateArray } from "#modules/Utils";
import { ButtonStyle, Collection, ComponentType, userMention } from "discord.js";

import { GetCachedOutfitAttachment, GetCachedOutfitAttachmentPreview, GetNavBar, NumerotedListToColumns } from "../index.js";

export default [
  {
    name: "settings",
    beforeUpdate: function() {
      if (!this.data._settings) this.data._settings = { index: 0, page: 0 };
    },
    components: function() {
      let canManageAnyGroup = this.data.groups.some(g => g.can(SOP_PERMISSION.MANAGE_GRP));

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          "# Configuration du Smash or Pass",
          ".===",
          {
            type: ComponentType.Section,
            components: [
              "## Gérer les collections",
              "Permet de créer et gérer les différents groupes",
            ],
            accessory: {
              emoji: "👥",
              label: "Gérer",
              action: "goto:settings-group",
              style: ButtonStyle.Primary,
              disabled: !canManageAnyGroup
            }
          },
          ".===",
          {
            type: ComponentType.Section,
            components: [
              "## Gérer les personnages",
              "Permet de créer et gérer des personnages",
            ],
            accessory: {
              emoji: "👥",
              label: "Gérer",
              action: "goto:settings-character",
              style: ButtonStyle.Primary,
              // disabled: !canManageAnyGroup
            }
          },
          ".---",
          [
            { emoji: '🏠', label: "Accueil", action: "goto:home", style: ButtonStyle.Secondary },
          ]
        ]
      }];
    }
  },
  {
    name: "settings-group",
    beforeUpdate: function() {
      if (!this.data._settings._group) this.data._settings._group = { slug: null, page: 0, navspeed: 0, delete: 0 };
      this.data._settings._group.pages = this.data.groups.filter(g => g.can(SOP_PERMISSION.MANAGE_GRP)).chunkOf(25);
    },
    components: function() {
      let sttgs = this.data._settings._group;
      const hasMultiplePages = sttgs.pages.length > 1;

      let deleteText = ['Supprimer','Sûr ?', 'CERTAIN•E ?!'][sttgs.delete];
      let deleteStyle = [ButtonStyle.Secondary, ButtonStyle.Primary, ButtonStyle.Danger][sttgs.delete];

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# Configuration du Smash or Pass",
            "Ici tu peux créer/modifier/supprimer des groupes de personnages.",
            'Un groupe est une "collection" assimilable à un univers différents par exemple.',
            "",
            "Collections modifiable :",
            NumerotedListToColumns(sttgs.pages[sttgs.page].map((e,i) => `${(i+1)+(sttgs.page*25)}. ${e.name}`), 2),
            "",
            hasMultiplePages && `-# Vitesse de navigation : ±${[1,5,10][sttgs.navspeed]} | Page ${sttgs.page+1}/${sttgs.pages.length}`
          ].filter(isString),
          '.---',
          [
            {
              label: "Créer",
              action: async function({interaction}) {
                let modal = new ModalForm({ title: "Nommer le groupe", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom du groupe", placeholder: "Nouvelle Aube" })
                  .addRow().addTextField({ name: 'slug', label: "Slug du groupe", placeholder: "na", required: false })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                let createdgroup = await dbManager.SOP.group.createWithAuth({
                  name: result.get('name'),
                  slug: result.get('slug') || result.get('name').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z]+/g,'').simplify(),
                  ownerId: this.data.user.id,
                }, this.element.member, this.data.userPermission).catch(e => null);

                if (!createdgroup) return false;

                this.data.groups.push(createdgroup);
                this.data._settings._group.slug = createdgroup.slug;

                return true;
              },
              style: ButtonStyle.Secondary,
              disabled: this.data.userPermission < PERMISSION.ADMIN
            },
            { label: "Modifier",  action: "goto:settings-group-edit", style: ButtonStyle.Secondary, disabled: !sttgs.slug },
            {
              label: deleteText,
              style: deleteStyle,
              disabled: !sttgs.slug,
              action: () => {
                if (sttgs.delete < 2) {
                  sttgs.delete++;
                } else {
                  const index = this.data.groups.findIndex(group => group.slug == sttgs.slug);
                  if (index >= 0) {
                    dbManager.SOP.group.delete(sttgs.slug);
                    this.data.groups.splice(index, 1)
                    sttgs.slug = null;
                    sttgs.delete = 0;
                  };
                }
                return true;
              },
            },
          ],
          [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionner un groupe",
              options: sttgs.pages[sttgs.page]?.map((group, index) => ({
                label: `${(index+1)+(sttgs.page*25)}. ${group.name}`,
                value: group.slug,
                default: group.slug == sttgs.slug,
              })) ?? [{ label: "Aucun group a afficher", value: "none", default: true }],
              disabled: !sttgs.pages[sttgs.page]?.length,
              action: function({interaction}) {
                sttgs.slug = interaction.values[0];
                return true;
              },
            }
          ],
          hasMultiplePages && GetNavBar(sttgs),
          [
            {
              emoji: '👈',
              label: "Retour",
              action: () => {
                delete this.data._settings._group
                this.goto('settings');
                return true;
              },
            },
          ]
        ] 
      }];
    },
  },
  {
    name: "settings-group-edit",
    beforeUpdate: function({ client, interaction }) {
      if (!this.data._settings._group._edit) {
        this.data._settings._group._edit = {
          mode: null, delete: 0, deltm: null, index: null,
          group: this.data.groups.find(g => g.slug == this.data._settings._group.slug),
          
          guild: { page: 0, navspeed: 0, pages: [], mapped: null },
          role: { page: 0, navspeed: 0, pages: [], mapped: null },
          user: { page: 0, navspeed: 0, pages: [], mapped: null },
        }
      };

      const sttgs = this.data._settings._group._edit;

      if (sttgs.group) {
        const GetPermissionKey = (p) => !p ? null : p.guild ? `${p.type}:${p.guild}:${p.id}` : `${p.type}:${p.id}`;
        
        sttgs.guild.mapped = new Collection();
        sttgs.role.mapped = new Collection();
        sttgs.user.mapped = new Collection();

        sttgs.group.permissions.forEach(permission => {
          let id = GetPermissionKey(permission);

          sttgs[permission.type].mapped.set(id, {
            permission,
            text: `${sttgs[permission.type].mapped.size + 1}. **[${permission.value}]** ${permission.name}`,
            formated: {
              label: `${sttgs[permission.type].mapped.size + 1}. ${permission.name}`,
              value: id,
              default: id == GetPermissionKey(sttgs.permission)
            }
          });
        });
        
        if (sttgs.mode && sttgs.mode !== 'settings') {
          sttgs[sttgs.mode].pages = sttgs[sttgs.mode].mapped.values().array().chunkOf(25);
        }
      }
    },
    components: function() {
      const sttgs = this.data._settings._group._edit;
      const hasMultiplePages = (sttgs.mode && sttgs.mode !== 'settings') ? sttgs[sttgs.mode].pages.length > 1 : false;

      const formatEmbedText = (entry) => entry.text.limit(40);

      const UpdateGroup = (data) => {
        sttgs.group = data;
        let gindex = this.data.groups.findIndex(g => g.slug == data.slug);
        if (gindex >= 0) this.data.groups[gindex] = sttgs.group;
      }

      const category = (sttgs.mode && sttgs.mode !== 'settings') ? sttgs[sttgs.mode] : {};
      const auth = { member: this.element.member, userPermission: this.data.userPermission };

      return [{
        type: ComponentType.Container,
        accent_color: this.data.color.indigo,
        components: [
          [
            "# Configuration du Smash or Pass",
            !sttgs.mode && [
              "Pour commencer gestion des permissions, veuillez choisir entre :",
              "",
              "**GUILDS** : Permet de définir les permissions à l'échelle d'un serveur.",
              "-# La permission n'est valable que si la commande est executée depuis ce serveur.",
              "",
              "**ROLES** : Permet de définir les permissions liées à une rôle spécifique.",
              "-# Ce niveau de permission est également spécifique à un serveur",
              "",
              "**USERS** : Permet de définir les permissions pour une personne précisement.",
              "Une permission données à un utilisateur sera valable à travers touts les serveurs.",
              "",
              "**SETTINGS** : Paramètres généraux du groupe.",
              "Pour la rendre publique par défaut ou transféré la propriété à une autre personne.",
            ],
            sttgs.mode == 'guild' && [
              "## Permissions de guilds",
              (sttgs.guild.pages[sttgs.guild.page]?.map(formatEmbedText)?.join('\n') || "Rien ici").limit(1024)
            ],
            sttgs.mode == 'role' && [
              "## Permissions de rôles",
              (sttgs.role.pages[sttgs.role.page]?.map(formatEmbedText)?.join('\n') || "Rien ici").limit(1024)
            ],
            sttgs.mode == 'user' && [
              "## Permissions d'utilisateur•ice",
              (sttgs.user.pages[sttgs.user.page]?.map(formatEmbedText)?.join('\n') || "Rien ici").limit(1024)
            ],
            sttgs.mode == 'settings' && [
              "## Paramètres généraux",
              `Est un groupe publique (jouable par tous) : ${sttgs.group.settings.isPublic ? 'Oui' : 'Non'}`,
              `Propriétaire du groupe : <@${sttgs.group.ownerId}>`,
            ],
            "",
            "Nb: Les permissions sont vérifiées dans cet ordre là : GUILDS → ROLES → USERS",
            "Donc si vous donner une permission pour un serveur, même si manuellement la permission n'est pas spécifiée dans un role ou un utilisateur, la personne aura la dites permissions"
          ].flat().filter(isString),
          ".===",
          Object.entries({ guild: "Guilds", role: "Rôles", user: "Utilisateurs", settings: "Paramètres" }).map(([value, label]) => ({
            label,
            action: () => {
              if (this.data._settings._group._edit.mode == value) {
                this.data._settings._group._edit.mode = null;
              } else {
                this.data._settings._group._edit.mode = value;
              }
              this.data._settings._group._edit.permission = null;
              this.data._settings._group._edit.index = null;
              return true;
            },
            style: sttgs.mode == value ? ButtonStyle.Primary : ButtonStyle.Secondary,
          })),
          (sttgs.mode && sttgs.mode !== 'settings') && [
            {
              label: "Ajouter",
              action: async function({ client, interaction }) {
                let modal = new ModalForm({ title: "Nommer le groupe", time: 120_000 });

                if (sttgs.mode == "guild") { 
                  modal
                    .addRow().addTextField({ name: 'id',   label: "Id du serveur",  placeholder: interaction.guild.id, value: interaction.guild.id })
                    .addRow().addTextField({ name: 'name', label: "Nom du serveur", placeholder: interaction.guild.name, required: false })
                  ;
                } else
                
                if (sttgs.mode == "role") { 
                  modal.addRow().addTextField({ name: 'id',   label: "Id du role",  placeholder: "313338974670712264" });
                } else
                
                if (sttgs.mode == "user") { 
                  modal.addRow().addTextField({ name: 'id',   label: "Id de l'utilisateur",  placeholder: this.element.member.id });
                }

                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('id')) return false;
                
                let id = result.get('id');
                let name;
                
                let guild = client.guilds.cache.get( result.get('id') ) || interaction.guild;
                if (sttgs.mode == 'guild') {
                  name = result.get('name') || guild.name || `GUILD:${id}`;
                } else
                if (sttgs.mode == 'role') {
                  let role = guild?.roles.cache.get(id);
                  name = role?.name || `ROLE:${id}`;
                } else
                if (sttgs.mode == 'user') {
                  let user = guild?.members.cache.get(id)?.user;
                  name = user?.username || id;
                }

                const permission = { id, name, type: sttgs.mode };
                if (sttgs.mode === "role") permission.guild = this.element.guild.id;

                let updated = await dbManager.SOP.group.updatePermission(sttgs.group.slug, permission, auth);
                if (!updated) return false;
                
                UpdateGroup(updated);
                
                return true;
              }
            },
            {
              label: "Renommer",
              disabled: sttgs.permission == null,
              action: async ({ interaction }) => {
                let modal = new ModalForm({ title: "Renommer la permission", time: 120_000 })
                  .addRow().addTextField({ name: 'name', label: "Nom indicatif de la permission", placeholder: sttgs.permission.name, value: sttgs.permission.name })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                sttgs.permission.name = result.get('name');
                
                let updated = await dbManager.SOP.group.updatePermission(sttgs.group.slug, sttgs.permission, auth);
                if (!updated) return false;
                
                UpdateGroup(updated);

                return true;
              }
            },
            {
              label: ["Supprimer", 'Sûr ?', 'CERTAIN•E ??'][sttgs.delete],
              style: [ButtonStyle.Secondary, ButtonStyle.Primary, ButtonStyle.Danger][sttgs.delete],
              disabled: sttgs.permission == null,
              action: async () => {
                if (sttgs.deltm) clearTimeout(sttgs.deltm);

                if (sttgs.delete < 2) {
                  sttgs.delete++;
                  sttgs.deltm = setTimeout(() => sttgs.delete = 0, 5000);
                } else {
                  sttgs.delete = 0;
                  let updated = await dbManager.SOP.group.removePermission(sttgs.group.slug, sttgs.permission, auth);
                  
                  sttgs.permission = null;
                  
                  if (!updated) return false;
                  UpdateGroup(updated);
                }

                return true;
              }
            },
          ],
          (sttgs.mode && sttgs.mode !== 'settings') && [
            {
              type: ComponentType.StringSelect,
              placeholder: "Selectionner une option",
              min_values: 0, max_values: 1,
              options: category.pages[category.page]?.length > 0
                ? category.pages[category.page]?.map(e=> e.formated)
                : [{ label: "Aucune option a afficher", value: "none", default: true }],
              disabled: !category.pages[category.page]?.length,
              action: function({interaction}) {
                sttgs.permission = category.mapped.get(interaction.values[0])?.permission;
                return true;
              },
            }
          ],
          (sttgs.mode && sttgs.mode !== 'settings') && (sttgs.permission ? [
            {
              type: ComponentType.StringSelect,
              placeholder: "Aucune permissions accordées",
              min_values: 0, maxValues: Object.keys(SOP_PERMISSION).length,
              options: Object.entries(SOP_PERMISSION).map(([label, value]) => {
                return { label, value, default: (value & (sttgs.permission?.value ?? 0)) == value };
              }),
              disabled: sttgs.permission == null,
              action: async function({interaction}) {
                sttgs.permission.value = interaction.values.reduce((acc,cu) => acc + Number(cu), 0);
                
                let updated = await dbManager.SOP.group.updatePermission(sttgs.group.slug, sttgs.permission, auth);
                if (!updated) return false;
                
                UpdateGroup(updated);

                return true;
              },
            }
          ] : hasMultiplePages ? GetNavBar(sttgs) : null),
          sttgs.mode === 'settings' && [
            {
              label: sttgs.group.settings.isPublic ? "Est Publique" : "N'est pas Publique",
              style: sttgs.group.settings.isPublic ? ButtonStyle.Success : ButtonStyle.Danger,
              disabled: !sttgs.group.isOwner && this.data.userPermission < PERMISSION.ADMIN,
              action: async function() {
                const updated = await dbManager.SOP.group.setPublic(sttgs.group.slug, !sttgs.group.settings.isPublic, auth);
                if (updated) UpdateGroup(updated);
              }
            }
          ],
          [
            {
              emoji: '👈',
              label: "Retour",
              action: () => {
                delete this.data._settings._group._edit;
                this.goto('settings-group');
                return true;
              },
              style: ButtonStyle.Secondary
            },
          ]
        ]
      }];
    },
  },
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
              NumerotedListToColumns(sttgs.grp.pages[sttgs.grp.page].map((group, index) => `${(index+1)+(sttgs.grp.page*25)}. ${group.name}`.limit(40)), 2)
            ],
            (sttgs.slug && !sttgs.character) && [
              "## Veuillez ajouter ou selectionner un personnage",
              "### Une fois sélectionner, pour revenir à cette vue, vous pouvez le déselectionner",
              "Une fois selectionner, appuyez sur `modifier` pour configurer ses arcs narratifs et ses tenues",
              (sttgs.chr.pages.length === 0) ? "- Aucun personnage à afficher." :
              NumerotedListToColumns(sttgs.chr.pages[sttgs.chr.page].map((character, index) => `${(index+1)+(sttgs.chr.page*25)}. ${character.name}`.limit(40)), 2)
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
                this.data.characters = await dbManager.SOP.character.getAll(sttgs.slug);
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
              label: ["Supprimer le personnage", 'Sûr ?', 'CERTAIN•E ??'][sttgs.chr.delete],
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
    _embeds: function() {
      let sttgs = this.data._settings._character._edit;

      
      const l = (s,l=20) => s.length > Math.max(1, l) ? s.slice(0,Math.max(1,l-1))+"…" : s;

      // Génération du footer
      let footers = [];
      let fields = [];
      
      if (sttgs.mode == "arcs") {
        if (!sttgs.arc) {
          const rows = sttgs.arcs.pages[sttgs.arcs.page]?.map((arc, index) => `${(index+1)+(sttgs.arcs.page*25)}. ${l(arc.name)}`) ?? [];
          fields.push(
            { name: "Arcs Narratif", value: rows.slice(0, Math.ceil(rows.length/2)).join('\n') || '\u200b', inline: true },
            { name: "\u200b", value: rows.slice(Math.ceil(rows.length/2)).join('\n') || '\u200b', inline: true }
          );
        }
        
        footers.push(
          "Selection d'un arc",
          `Vitesse de navigation : ±${[1,5,10][sttgs.arcs.navspeed]} | Page ${sttgs.arcs.page+1}/${sttgs.arcs.pages.length}`,
        );
      }
      if (sttgs.mode == "outfits") {
        if (!sttgs.outfit) {
          const rows = sttgs.outfits.pages[sttgs.outfits.page]?.map((outfit, index) => {
            return `${(index+1)+(sttgs.outfits.page*25)}. ${l(outfit.name)}` + (sttgs.arcs.mapped[outfit.arc] ? ` (${l(sttgs.arcs.mapped[outfit.arc].name)})` : '')
          }) ?? [];

          fields.push(
            { name: "Outfits", value: rows.slice(0, Math.ceil(rows.length/2)).join('\n') || '\u200b', inline: true },
            { name: "\u200b", value: rows.slice(Math.ceil(rows.length/2)).join('\n') || '\u200b', inline: true }
          );
        } else {
          fields.push({
            name: l(sttgs.outfit.name) + (sttgs.arcs.mapped[sttgs.outfit.arc] ? ` (${l(sttgs.arcs.mapped[sttgs.outfit.arc].name)})` : ''),
            value: sttgs.outfit.artist.name ? sttgs.outfit.artist.link ? `[${sttgs.outfit.artist.name}](${sttgs.outfit.artist.link})` : sttgs.outfit.artist.name : "\u200b"
          });
        }

        footers.push(
          "Selection d'un outfit",
          `Vitesse de navigation : ±${[1,5,10][sttgs.outfits.navspeed]} | Page ${sttgs.outfits.page+1}/${sttgs.outfits.pages.length}`,
        );
      }

      return [{
        title: "Gestion du personnage.",
        description: "Ici tu peux modifier les arcs narratifs, les tenues ect...",
        image: sttgs.outfit ? {
          url: `attachment://${sttgs.outfit.filename}`
        } : null,
        fields,
        footer: {
          text: `${sttgs.character.uid} | ` + (footers.join(' | ') || sttgs.character.name || "Never Gonna Give You Up"),
        },
        color: 0x5865F2,
      }];
    },
    files: function() {
      let sttgs = this.data._settings._character._edit;
      return sttgs.attachments;
    },
    components: function() {
      let sttgs = this.data._settings._character._edit;

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
                default: arc.id == sttgs.arc,
              })) ?? [{ label: "Aucun arc narratif a afficher", value: "none" }],
              disabled: !sttgs.arcs.pages[sttgs.arcs.page],
              action: function({interaction}) {
                sttgs.arc = interaction.values[0];
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
                  .addRow().addTextField({ name: 'name', label: "Nom de l'arc narratif", placeholder: "Nom de fou furieux", value: sttgs.arcs.mapped[sttgs.arc]?.name })
                ;
                
                let result = await modal.setInteraction(interaction).onError((e) => this.handleError(e)).popup();
                if (!result || !result.get('name')) return false;

                let updated = await dbManager.SOP.character.updateArc(sttgs.character.uid, {
                  id: sttgs.arcs.mapped[sttgs.arc]?.id,
                  name: result.get('name'),
                });

                if (!updated) return false;

                UpdateCharacter(updated);

                return true;
              },
            },
            {
              label: ["Supprimer l'arc", 'Sûr ?', 'CERTAIN•E ??'][sttgs.arcs.delete],
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
                  let updated = await dbManager.SOP.character.removeArc(sttgs.character.uid, sttgs.arcs.mapped[sttgs.arc]);
                  if (updated) UpdateCharacter(updated);
                  sttgs.arcs.delete = 0;
                  sttgs.arc = null;
                }
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
                  default: (outfit.name == sttgs.outfit?.name) && (outfit.arc == sttgs.outfit?.arc),
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
            // arc select (outfit change arc)
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
                interaction.deferUpdate();
                
                const filter = (collect) => {
                  if (interaction.user.id !== collect.author.id) return false;
                  return /\bcancel\b/gmi.test(collect.content) || ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                }
                
                let instruction = await interaction.channel.send({
                  content: `${interaction.user} Envoyez un message contenant des liens et/ou des images attachées.\nEcrit \`cancel\` pour annuler.\n_Annulation automatique <t:${ Date.timestamp() + 130 }:R>_`
                });
                let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(c => c).catch(() => null);
                instruction.delete().catch(noop);
                
                if (collected) {
                  await collected.values().array().map(async (message) => {
                    let toprocess = message;
                    if (message.reference) {
                      try {
                        let ref = await message.fetchReference();
                        if (ref) toprocess = ref;
                      } catch (err) {
                        console.error(err);
                      }
                    }

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

                    await message.delete().catch(noop);
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
              label: ["Supprimer l'outfit", 'Sûr ?', 'CERTAIN•E ??'][sttgs.outfits.delete],
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
                interaction.deferUpdate();
                
                const filter = (collect) => {
                  if (interaction.user.id !== collect.author.id) return false;
                  return /\bcancel\b/gmi.test(collect.content) || ExtractUrlsFromContent(collect).length > 0 || ExtractUrlsFromAttachments(collect).length > 0;
                }
                
                // Ask for images
                let instruction = await interaction.channel.send({
                  content: `${interaction.user} Envoyez un message contenant un lien ou une image attachée.\nEcrit \`cancel\` pour annuler.\s_Annulation automatique <t:${ Date.timestamp() + 130 }:R>_`
                });
                let collected = await interaction.channel.awaitMessages({ filter,  max: 1, idle: 120_000, errors: ['time'] }).then(c => c).catch(() => null);
                instruction.delete().catch(noop);
                
                if (!collected) return false;

                // Get only the first
                let toprocess = collected.values().array()[0];
                if (!toprocess) return false;
                toprocess.delete().catch(noop);

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
                  interaction.channel.send(`${interaction.user} J'avais dis une image ${Emotes.catrage}`).then(m => Wait(5_000).then(() => m.delete()));
                }
                
                // Download Image & Update outfit 
                let name = `${sttgs.character.uid}_${MD5(url)}`;
                let filename = await SaveUrlToLocal(url, './assets/sop/outfits/', name);

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
                
                let updated = await dbManager.SOP.character.rename(sttgs.character.uid, result.get('name'));
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
              label: sttgs.character.rules.can_be_pass ? "Rendre Non Passable" : "Rendre Passable",
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
              "## 📖 Qu'est-ce qu'un Arc Narratif ?",
              "Un **Arc Narratif** représente un chapitre majeur de l'histoire du personnage.",
              "Il marque un moment charnière qui transforme son caractère ou ses objectifs.",
              "Un nouvel arc s'accompagne souvent d'un nouveau look (tenue, coiffure, cicatrices).",
              "Sa psychologie et son état d'esprit ne sont plus les mêmes qu'auparavant.",
              "_En résumé : Nouveau chapitre, nouvelle version de soi._",
              "",
              `${sttgs.character.name} possède actuellement ${sttgs.character.arcs.length} arcs narratif(s)`,
              "",
              (!sttgs.arc && ValidateArray(sttgs.arcs.pages[sttgs.arcs.page], []).length > 0) && [
                NumerotedListToColumns(sttgs.arcs.pages[sttgs.arcs.page]?.map((arc, index) => `${(index+1)+(sttgs.arcs.page*25)}. ${arc.name}`.limit(30)), 2),
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
                "",
              ],
              sttgs.outfit && [
                `## ${sttgs.outfit.name}`,
                sttgs.outfit.arc && `### Arc: ${sttgs.arcs.mapped[sttgs.outfit.arc]?.name || 'Arc inconnu'}`,
                sttgs.outfit.artist && "Visuel créer par " + (sttgs.outfit.artist.link ? `[${sttgs.outfit.artist.name}](${sttgs.outfit.artist.link})` : sttgs.outfit.artist),
                "",
              ],
              (!sttgs.outfit && ValidateArray(sttgs.outfits.pages[sttgs.outfits.page], []).length > 0) && [
                NumerotedListToColumns(sttgs.outfits.pages[sttgs.outfits.page]?.map((outfit, index) => {
                  return `${(index+1)+(sttgs.outfits.page*25)}. ${outfit.name}`.limit(30);
                }), 2),
              ],
            ].flat(),

            // SETTINGS
            sttgs.mode === "settings" && [
              "## Paramètres généraux",
              `**Propriétaire**: <@${sttgs.character.rules.owner}>`,
              `**Est smashable**: ${sttgs.character.rules.can_be_smash ? 'Oui' : 'Non'}`,
              `**Est passable**: ${sttgs.character.rules.can_be_pass ? 'Oui' : 'Non'}`,
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