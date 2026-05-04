import { ComponentType, ButtonStyle, Collection } from "discord.js";

import { noop, DiscordMenu, uncachedImport, isString, ValidateArray, ModalForm } from "#modules/Utils";
import Emotes from "#modules/Emotes"
import { COMMAND_TYPE } from "#constants";
import Locales from "#modules/Locales";

const { GetNavBar } = await uncachedImport("./shared");

// const PageHome = await uncachedImport("./pages/home.js").then(m => m.default);

export async function HelpMenu({ client, discordElement, GuildData, UserData, userPermission }) {  
  let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);
  loadingEmoteMessage.delete().catch(noop);
  
  const AllowedCommands = new Collection();
  const AllowedCategories = new Set();

  const collections = [ client.textCommands, client.slashCommands, client.hybridCommands ];

  for (let collection of collections) {
    for (let command of collection.values()) {
      if (userPermission >= (command.userPermission ?? 0)) {
        AllowedCommands.set(command.name.toLowerCase(), command);
        
        for (let category of command.categories.toLowerCase()) {
          AllowedCategories.add(category);
        }
      }
    }
  }

  const HelpMenuInstance = new DiscordMenu({
  element: discordElement,
  ephemeral: true, v2: true,
  sendOptions: { allowedMentions: { users: [] } },
  collectorOptions: {
    idle: 600_000 // 10 minutes
  },
  data: {
    color: {
      red: 0xFF0000,
      green: 0x00FF00,
      blue: 0x0000FF,
      indigo: 0x6558F2,
      magenta: 0xF25865,
      coral: 0xF26558,
      lime: 0x65F258,
    },
    displayOptions: {
      phone: false,
      numberOfColumn: 2,
    },
    guild: GuildData,
    user: UserData,
    userPermission: userPermission ?? 0,

    commands: {
      allowed: AllowedCommands,
      categories: Array.from(AllowedCategories).sort(),
    },
    
    _help: null,
  },
  pages: [
    {
      name: "help",
      beforeUpdate: function() {
        if (!this.data._help) {
          this.data._help = {
            types: {
              [COMMAND_TYPE.MESSAGE]: {
                text: "Prefix",
                emote: Emotes.command_icon.chat.white,
                symbol: '>',
              },
              [COMMAND_TYPE.HYBRID]: {
                text: "Prefix & Slash",
                emote: Emotes.command_icon.hybrid.white,
                symbol: '&',
              },
              [COMMAND_TYPE.SLASH]: {
                text: "Slash",
                emote: Emotes.command_icon.slash.white,
                symbol: '/',
              },
            },
            exclusive_type: false,
            query_type: 0,
            query_categories: [],
            query: null,
            filter: (cmd) => {
              const { exclusive_type, query_type, query_categories, query } = this.data._help;

              if (query_type || query_categories.length || query) {
                let check_query_type = true;
                let check_query_categories = true;
                let check_query = true;

                if (query_type) {
                  if (exclusive_type && cmd.type !== query_type) check_query_type = false;
                  else check_query_type = [cmd.type, query_type].every(type => [COMMAND_TYPE.MESSAGE, COMMAND_TYPE.HYBRID].includes(type)) || [cmd.type, query_type].every(type => [COMMAND_TYPE.SLASH, COMMAND_TYPE.HYBRID].includes(type));
                }

                if (query_categories.length > 0) {
                  check_query_categories = cmd.categories.some(category => query_categories.includes(category));
                }
                
                if (query) {
                  const lowered = query.toLowerCase().simplify();
                  const aliases = [ cmd.name, ...cmd.aliases ].toLowerCase().simplify();
                  const reg = new RegExp(lowered, 'gi');

                  check_query = aliases.some(alias => reg.test(alias));
                }

                return check_query_type && check_query_categories && check_query;
              }

              return !cmd.secret;
            },
            page: 0, pages: [], navspeed: 0,
          }
        }

        const sttgs = this.data._help;

        sttgs.pages = this.data.commands.allowed.values().filter(sttgs.filter).chunkOf(25);
        
        sttgs.page = Math.clamp(sttgs.pages.lastIndex, 0, sttgs.pages.lastIndex || 0);
      },
      components: function() {
        const commands = this.data.commands;
        const sttgs = this.data._help;

        return [{
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            sttgs.pages[sttgs.page]?.length && `# ${sttgs.pages.flat().length} Commandes trouvée·s`,
            sttgs.pages[sttgs.page]?.length > 0
              ? sttgs.pages[sttgs.page].flatMap(command => {
                return [
                  `## ${sttgs.types[command.type].emote} ${command.name}`,
                  command.aliases.length > 0 && `> -# Alias : \`${command.aliases.join('`, `')}\``,
                  command.categories.length > 0 && `> -# Categories : \`${command.categories.join('`, `')}\``,
                  `> -# Fonctionne avec : ${sttgs.types[command.type].text}`,
                  '> ' + command.description,
                ].filter(isString);
              })
              : [
                '# -,.​.,.​-\'\\`\'°-,​_,.-\'\\`\'° 🛩️',
                '## Aucun résultat trouvé.',
              ],
            '.===',
            sttgs.query && `Recherche actuelle **\`${sttgs.query}\`**`,
            [
              {
                emoji: { name: "❔" },
                label: "Rechercher",
                action: async function({ interaction }) {
                  let modal = new ModalForm({ title: "Faire une recherche", time: 120_000 })
                    .addRow().addTextField({ name: 'query', label: "Recherche (laissez vide pour supprimer)", placeholder: "Le nom ou l'alias d'une commande par exemple", value: sttgs.query, required: false })
                  ;

                  let result = await modal.setInteraction(interaction).popup();
                  if (!result) return false;
                  
                  if (!result.get('query')) sttgs.query = null;
                  else sttgs.query = result.get('query').toLowerCase().simplify();

                  return true;
                }
              }
            ],
            [
              ...COMMAND_TYPE.entries().map(([key, value]) => ({
                emoji: Emotes.GetEmojiObject(sttgs.types[value].emote),
                style: sttgs.query_type === value ? ButtonStyle.Primary : ButtonStyle.Secondary,
                label: key.toUcFirst(),
                action: function() {
                  if (sttgs.query_type === value) {
                    sttgs.query_type = 0;
                  } else sttgs.query_type = value;
                }
              })),
              {
                // emoji: { name: "❕" },
                label: "❕",
                style: sttgs.exclusive_type ? ButtonStyle.Danger : ButtonStyle.Secondary,
                action: async function() {
                  sttgs.exclusive_type = !sttgs.exclusive_type;
                }
              }
            ],
            [{
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez une catégorie",
              disabled: commands.categories.length === 0,
              min_values: 0, max_values: Math.min(commands.categories.length, 25),
              options: (commands.categories.length > 0)
                ? commands.categories.map(value => ({ label: value.toUcFirst(), value, default: sttgs.query_categories.includes(value) }))
                : [{ label: "Aucune catégorie", value: "none", default: true }]
              ,
              action: async function({ interaction }) {
                sttgs.query_categories = interaction.values;
                return true;
              },
            }],
            
            sttgs.pages.length > 1 && GetNavBar(sttgs),
            
            [{
              type: ComponentType.StringSelect,
              placeholder: "Selectionnez la commande",
              disabled: ValidateArray(sttgs.pages[sttgs.page], []).length === 0,
              options: ValidateArray(sttgs.pages[sttgs.page], []).length > 0
                ? sttgs.pages[sttgs.page].map((e,i) => ({ label: `${sttgs.types[e.type].symbol} ${e.name}`, value: e.name.toLowerCase().simplify() }))
                : [{ label: "Aucune commande à afficher", value: "none", default: true }]
              ,
              action: async function({ interaction }) {
                sttgs.selected = commands.allowed.get(interaction.values[0]);
                this.goto("help-view");
                return true;
              },
            }],
            [{
              type: ComponentType.Button,
              style: ButtonStyle.Danger,
              emoji: { name: "🔒" },
              label: "Fermer",
              action: "stop"
            }],
          ]
        }];
      }
    },
    {
      name: "help-view",
      components: function() {
        const command = this.data._help.selected;

        let helpsection = Locales.get(`commandinfo.${command.name.toLowerCase().simplify()}.help`, [ command.name ], { null: true, array: true })?.join('\n');
        if (!helpsection) helpsection = Locales.get(`generic.command.help.undefined`);

        console.log(helpsection)

        return [{
          type: ComponentType.Container,
          accent_color: this.data.color.indigo,
          components: [
            [
              [
                `# ${command.name}`,
                command.aliases.length > 0 && `### Aliases : ${command.aliases.join(', ')}`,
                command.categories.length > 0 && `### Categories : ${command.categories.join(', ')}`,
                command.syntax && `Syntaxe : ${command.syntax}`,
                command.description,
              ].filter(isString),

              [ helpsection ],

              [
                {
                  type: ComponentType.Button,
                  emoji: { name: "👈" },
                  label: "Retour",
                  action: "goto:help"
                },
                {
                  type: ComponentType.Button,
                  style: ButtonStyle.Danger,
                  emoji: { name: "🔒" },
                  label: "Fermer",
                  action: "stop"
                }
              ],
            ]
          ]
        }]
      }
    },
  ]
  });
  
  await HelpMenuInstance.send();
  await HelpMenuInstance.handle({ client });
}