import { PERMISSION, SOP_PERMISSION } from "#constants";
import { dbManager } from "#modules/database/Manager";
import { ModalForm, isString } from "#modules/Utils";
import { ButtonStyle, Collection, ComponentType } from "discord.js";

import { GetNavBar, NumerotedListToColumns } from "../../index.js";

export default [
  {
    name: "settings-group",
    beforeUpdate: function() {
      if (!this.data._settings._group) this.data._settings._group = { slug: null, page: 0, navspeed: 0, delete: 0 };
      this.data._settings._group.pages = this.data.groups.filter(g => g.can(SOP_PERMISSION.MANAGE_GRP)).chunkOf(25);
    },
    components: function() {
      let sttgs = this.data._settings._group;
      const displayOptions = this.data.displayOptions;
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
            NumerotedListToColumns(sttgs.pages[sttgs.page].map((e,i) => `${(i+1)+(sttgs.page*25)}. ${e.name}`), displayOptions.numberOfColumn),
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
  }
]