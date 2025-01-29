const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ButtonStyle, ComponentType, TextInputStyle } = require('discord.js');
const client = require('../../app');
const Emotes = require('../../assets/Emotes');

const CommandObject = {
    name: "help",
    aliases: ['aide','h','oskour','?'],
    description: null,
    syntax: null,
    category:'general',
    userPermission: client.PERMISSION.USER,
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: "search",
            description: Locale.get(`commandinfo.help.option.search.description`),
        },
    ],

    run: async ({client, interaction, message, args, GuildData, UserData, LangToUse, userPermissionLevel}) => {
        let member = interaction?.member || message?.member;

        let pages = await ParseArgs({ interaction, message, args, LangToUse, userPermissionLevel });
        if (pages === null) {
            if (interaction) interaction.reply({ content: Locale.get("command.help.error.notfound", [(interaction||message).member.id]), ephemeral: true });
            if (message) message.channel.send(Locale.get("command.help.error.notfound", [(interaction||message).member.id])).then(m => Wait(5_000).then(() => m.delete()));
            return;
        }
        HelpMenu({interaction, message, member, pages, LangToUse, userPermissionLevel});
    },
};

async function HelpMenu({interaction, message, member, pages, LangToUse, userPermissionLevel}) {
    const NohtingImage = 'https://media.giphy.com/media/13d2jHlSlxklVe/giphy.gif';
    const TimeoutImage = 'https://media.giphy.com/media/kDwIbnBqKe3D7BSqrt/giphy.gif';

    // Embed de page
    const embed = new EmbedBuilder()
        .setTitle(Locale.get("command.help.embed.title"))
        .setDescription(Locale.get("command.help.embed.description"))
        .setFields(pages[0])
        .setColor(Array.from(Array(3), () => getRandomRangeFloor(127,255)))
        .setFooter({text: Locale.get("command.help.embed.footer", [client.user.username, client.config.version, 1, 1, pages.length])})
        .setTimestamp()
    ;

    // Define discordElement
    let discordElement;
    if (interaction) {
        await interaction.deferReply();
        discordElement = interaction;
    }
    if (message) discordElement = message;
    if (!discordElement) throw new Error("discordElement is not defined.");

    // Define menu's constants
    const uid = discordElement.id;
    const Speeds = [1,5,10];
    let page = 0;
    let pageSpeed = 0;

    // Send menu's message
    let MessageMenu = await discordElement[interaction ? 'editReply': 'reply']({ embeds: [embed], components: GetHelpButtons({uid, page, pageSize: pages.length, pageSpeed, LangToUse}) });
    
    // Component Collector
    async function MessageMenuFilter(collectedInteraction) {
        if (collectedInteraction.user.id !== member.id) await collectedInteraction.deferUpdate();
        return collectedInteraction.customId.startsWith(uid) && collectedInteraction.user.id === member.id;
    };
    const MenuCollector = MessageMenu.createMessageComponentCollector({ filter: MessageMenuFilter, idle: 2*60*1000 });
    
    // Close
    MenuCollector.on('end', async (collected, reason) => {
        let image = { idle: TimeoutImage, user: NohtingImage };
        await MessageMenu.edit({ components: [], embeds: [{
            description: Locale.get("command.help.embed.closereason."+ reason),
            color: embed.color,
            image: { url: image[reason] },
        }]});
        await MessageMenu.react('🔒');
    });

    // Collect
    MenuCollector.on('collect', async (collectedInteraction) => {
        switch (collectedInteraction.customId.split(':')[1]) {
            case "help-page-left":
                page -= Speeds[pageSpeed];
                if (page < 0) page = 0;

                embed.setFields(pages[page]);
            break;
            
            case "help-page-speed-down":
                pageSpeed -= 1;
            break;
            
            case "help-page-speed-up":
                pageSpeed += 1;
            break;
            
            case "help-page-right":
                page += Speeds[pageSpeed];
                if (page > pages.length - 1) page = pages.length - 1;
                
                embed.setFields(pages[page]);
            break;
            
            case "help-page-goto":
                let value = await GetInput({
                    interaction: collectedInteraction,
                    title: Locale.get("command.help.modal.goto.title"),
                    label: Locale.get("command.help.modal.goto.label"),
                    placeholder: Locale.get("command.help.modal.goto.placeholder", [1, pages.length]),
                    type: Number,
                    default: 0
                });
                page = value - 1;
                if (isNaN(value) || value < 1) page = 0;
                if (value > pages.length) page = pages.length - 1;
            break;

            case "help-new-search":
                let search = await GetInput({
                    interaction: collectedInteraction,
                    title: Locale.get("command.help.modal.new_search.title"),
                    label: Locale.get("command.help.modal.new_search.label"),
                    placeholder: Locale.get("command.help.modal.new_search.placeholder"),
                    type: String,
                    default: ''
                });
                
                let args;
                if (discordElement.editReply) {
                    args = [{ name: 'search', value: search }];
                } else {
                    args = search.split(/\s/gmi);
                }

                let result = await ParseArgs({
                    interaction: discordElement.editReply ? discordElement : null,
                    message,
                    args,
                    LangToUse, userPermissionLevel
                });
                
                if (result === null) return discordElement.channel.send(Locale.get("command.help.error.notfound", [discordElement.member.id])).then(m => Wait(5_000).then(() => m.delete()));
                
                page = 0;
                pages = result;
                embed.setFields(pages[page]);
            break;
            
            case "help-button-close":
                return MenuCollector.stop();
            break;
        }

        // deferUpdate to avoid "an error has occured" on components.
        if (!collectedInteraction.deferred && !collectedInteraction.replied) await collectedInteraction.deferUpdate();
        
        // Update Footer (Spped : $0 | Page $1/$2)
        embed.setFooter({text: Locale.get("command.help.embed.footer", [client.user.username, client.config.version, Speeds[pageSpeed], page+1, pages.length])});
        
        // Update menu.
        if (discordElement.editReply) { // interaction
            await discordElement.editReply({
                embeds: [ embed ], 
                components: GetHelpButtons({uid: discordElement.id, page, pageSize: pages.length, pageSpeed, LangToUse}),
            });
        } else { // message
            await MessageMenu.edit({
                embeds: [ embed ], 
                components: GetHelpButtons({uid: discordElement.id, page, pageSize: pages.length, pageSpeed, LangToUse}),
            });
        }
    });
}

async function ParseArgs({ interaction, message, args, LangToUse, userPermissionLevel }) {
    if (interaction) {
        args = args.find(arg => arg.name === 'search')?.value?.split(/\s/gmi) || [];
    }

    const DEBUGHELP = args[0]?.toLowerCase() === '--debug';
    if (DEBUGHELP) args.shift();
    
    const CommandType = {
        "chat": Emotes.command_icon.chat.white,
        "slash": Emotes.command_icon.slash.white,
        "hybrid": Emotes.command_icon.hybrid.white,
        "undefined": "?",
    };

    let PermitedCommands = [...client.commands, ...client.slashCommands, ...client.hybridCommands].filter(cmd => {
        let allowDM = (interaction||message).channel.type === 'DM' ? cmd.dm : true;
        return allowDM && !cmd.hidden && userPermissionLevel >= cmd.userPermission;
    });

    let pages;
    if (['--all','-a','*'].includes(args[0]?.toLowerCase())) {
        pages = PermitedCommands.map(command => {
            let subcommands = (command.options||[]).filter(opt => ["SUB_COMMAND", "SUB_COMMAND_GROUP"].includes(opt.type)).map(option => option.name.ucFirst());
            return {
                name: CommandType[String(command.CommandType)] +" "+ [command.name, ...(command.aliases||[])].map(n => n.ucFirst()).join(', '),
                value: command.description + '\n\nSyntax : `' + command.syntax +'`\n' + (subcommands.length > 0 ? "\nSubcommands :\n"+subcommands.join(', ') : '') + '\n\u200b',
            }
        }).chunkOf(20);
    } else if (args.length > 0) {
        let findCommand = null;
        while (args[0] && findCommand !== undefined) {
            if (findCommand?.options) {
                findCommand = findCommand.options.filter(opt => ["SUB_COMMAND", "SUB_COMMAND_GROUP"].includes(opt.type)).find(command => [command.name, ...(command.aliases||[])].includes(args[0]));
            } else {
                findCommand = PermitedCommands.find(command => [command.name, ...(command.aliases||[])].includes(args[0]));
            }
            args.shift();
        }

        if (!findCommand) return null;

        pages = [
            { name: CommandType[String(findCommand.CommandType)] +" "+ [findCommand.name, ...(findCommand.aliases||[])].map(n => n.ucFirst()).join(', '), value: findCommand.description +'\nSyntax : `'+ findCommand.syntax +'`\n\u200b' },
            ...(findCommand.options||[]).filter(opt => ["SUB_COMMAND", "SUB_COMMAND_GROUP"].includes(opt.type)).map(command => Object({ name: CommandType[String(findCommand.CommandType)] +" "+ [command.name, ...(command.aliases||[])].map(n => n.ucFirst()).join(', '), value: command.description})),
        ].chunkOf(20);
    } else {
        let alphabeticCategories = (a,b) => a.category > b.category? 1 : a.category < b.category ? -1 : 0;
        let categories = PermitedCommands.map(cmd => cmd.category).unique().sort(alphabeticCategories).chunkOf(20);

        pages = categories.map(c => c.map(category => {
            let commands = PermitedCommands.filter(cmd => cmd.category === category).map(cmd => cmd.name);
            return new Object({name: category.ucFirst(), value: commands.join(', ')});
        }));
    }

    if (DEBUGHELP) {
        while (pages.length < 20) {
            pages.push([{name:`PAGE N°${pages.length+1}`,value:'Ceci est une commande fictive afin d\'observer le système de multipage.'}]);
        }
    }

    return pages;
}

async function GetInput({ interaction, title = "Modal", placeholder = "TEXT_HERE", label = "INPUT_NAME", type = String, default: default_value }) {
    const uid = interaction.id;
    const modal = {
        title,
        custom_id: uid+":modal",
        components: [{
            type: ComponentType.ActionRow,
            components: [{
                type: ComponentType.TextInput,
                customId: uid+":modal-input",
                label,
                style: TextInputStyle.Short,
                placeholder,
                required: true
            }]
        }]
    };
    await interaction.showModal(modal);
    
    async function modalFilter(interaction) {
        if (interaction.customId === modal.custom_id) {
            await interaction.deferUpdate();
            return true;
        }
    };

    try {
        let response = await interaction.awaitModalSubmit({ filter: modalFilter, time: 60*1000 });
        return type(response.fields.getTextInputValue(uid+':modal-input'));
    } catch (error) {
        console.error(`[ MODAL-ERROR : ${Date.time()} ]`, error);
        return default_value;
    }
};


function GetHelpButtons({uid, page, pageSize, pageSpeed, LangToUse}) {
    if (page === undefined) page = 0;
    if (pageSpeed === undefined) pageSpeed = 0;

    const EmojiLeft = [Emotes.chevron.black.left.simple, Emotes.chevron.black.left.double, Emotes.chevron.black.left.triple];
    const EmojiRight = [Emotes.chevron.black.right.simple, Emotes.chevron.black.right.double, Emotes.chevron.black.right.triple];

    const ROWS = [
        {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    customId: uid+":help-page-left",
                    style: ButtonStyle.Secondary,
                    emoji: Emotes.GetEmojiObject(EmojiLeft[pageSpeed]),
                    disabled: (page === 0 || pageSize < 10)
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":help-page-speed-down",
                    style: ButtonStyle.Secondary,
                    emoji: {name: '➖'},
                    disabled: (pageSpeed < 1)
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":help-page-goto",
                    style: ButtonStyle.Secondary,
                    emoji: Emotes.GetEmojiObject(Emotes.compass.black),
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":help-page-speed-up",
                    style: ButtonStyle.Secondary,
                    emoji: {name: '➕'},
                    disabled: (pageSpeed > 1)
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":help-page-right",
                    style: ButtonStyle.Secondary,
                    emoji: Emotes.GetEmojiObject(EmojiRight[pageSpeed]),
                    disabled: (page === pageSize-1 || pageSize < 5)
                },
            ]
        },
        {
            type: ComponentType.ActionRow,
            components: [
                {
                    type: ComponentType.Button,
                    customId: uid+":help-new-search",
                    label: Locale.get("command.help.button.new_search"),
                    style: ButtonStyle.Secondary
                },{
                    type: ComponentType.Button,
                    customId: uid+":help-button-close",
                    label: Locale.get("command.help.button.close"),
                    style: ButtonStyle.Secondary,
                    emoji: {name:'🔒'}
                },
            ]
        },
    ];

    if (pageSize === 1) ROWS.shift();

    return ROWS;
}


CommandObject.description = Locale.get(`commandinfo.${CommandObject.name}.description`) || 'No description';
CommandObject.syntax = Locale.get(`commandinfo.${CommandObject.name}.syntax`) || '¯\\_(ツ)_/¯';

module.exports = CommandObject;