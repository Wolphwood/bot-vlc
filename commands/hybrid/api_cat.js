const { EmbedBuilder, ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, TextInputStyle } = require("discord.js");
const client = require("../../app");
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API = "https://catfact.ninja/";
const IMAGE_API = "https://cataas.com";

client.APIs.push({ name: "Cat Fact", link: API });
client.APIs.push({ name: "Cat as a service", link: IMAGE_API });

module.exports = {
    name: "cat",
    aliases: ["chat"],
    category: "fun",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "image",
            aliases: ["img", "i"],
            description: Locale.get(`commandinfo.cat.option.image.description`),
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "fact",
            aliases: ["anecdote"],
            description: Locale.get(`commandinfo.cat.option.fact.description`),
        },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "breeds",
            aliases: ['breed','espaces','espece'],
            description: Locale.get(`commandinfo.cat.option.breeds.description`),
        },
    ],
    run: async ({client, interaction, message, args, GuildData, UserData, LangToUse }) => {
        let discordElement = message || interaction;
        let member = discordElement.member;

        let subcommand = args.shift();
        if (!subcommand) subcommand = "image";


        let embed, response, data;
        switch (subcommand.toLowerCase().simplify()) {
            case "image":
            case "img":
            case "i":
                try {
                    // CALL API
                    response = await fetch(`${IMAGE_API}/cat`, {headers: {'Accept': 'application/json'}});                    
                } catch {}

                if (response?.status !== 200) { // Handle API's failures
                    console.inspect(response)

                    discordElement.reply({
                        content: Locale.get("command.cat.error.api.cataas.failure"),
                    }).then(m => {
                        if (message) Wait(5_000).then(() => m.delete());
                    });
                    return false;
                }

                data = await response.json();

                embed = new EmbedBuilder()
                    .setColor(Array.from(Array(3), () => getRandomRangeRound(127,255)))
                    .setImage(`${IMAGE_API}/cat/${data.id}`)
                    .setFooter({ text: Locale.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
                    .setTimestamp()
                ;

                if (interaction) interaction.reply({ embeds: [ embed ] });
                if (message) message.channel.send({ embeds: [ embed ] });
            break;

            // Embeded Gif are broken?
            case "gif":
            case "g":
                try {
                    // CALL API
                    response = await fetch(`${IMAGE_API}/cat/gif`, {headers: {'Accept': 'application/json'}});
                } catch {}

                if (response?.status !== 200) { // Handle API's failures
                    discordElement.reply({
                        content: Locale.get("command.cat.error.api.cataas.failure"),
                    }).then(m => {
                        if (message) Wait(5_000).then(() => m.delete());
                    });
                    return false;
                }

                data = await response.json();

                embed = new EmbedBuilder()
                    .setColor(Array.from(Array(3), () => getRandomRangeRound(127,255)))
                    .setImage(`${IMAGE_API}/cat/${data.id}`)
                    .setFooter({ text: Locale.get("generic.embed.footer", [(discordElement.guild.members.me.nickname || client.user.username), client.config.version, member.nickname || member.user.username]) })
                    .setTimestamp()
                ;

                if (interaction) interaction.reply({ embeds: [ embed ] });
                if (message) message.channel.send({ embeds: [ embed ] });
            break;
            
            case "fact":
            case "anecdote":
                try {
                    // CALL API
                    response = await fetch(API + "fact");
                } catch {}

                if (response.status !== 200) { // Handle API's failures
                    discordElement.reply({
                        content: Locale.get("command.cat.error.api.catfact.failure"),
                    }).then(m => {
                        if (message) Wait(5_000).then(() => m.delete());
                    });
                    return false;
                }

                data = await response.json();
                await discordElement.reply({ content: data.fact });
            break;

            case "breed":
            case "breeds":
            case "espece":
            case "especes":
                try {
                    // CALL API
                    response = await fetch(API + "breeds"+ "?" + new URLSearchParams({
                        limit: 99999999,
                    }));
                } catch {}

                if (response.status !== 200) { // Handle API's failures
                    discordElement.reply({
                        content: Locale.get("command.cat.error.api.catfact.failure"),
                    }).then(m => {
                        if (message) Wait(5_000).then(() => m.delete());
                    });
                    return false;
                }

                data = await response.json();
                let pages = data.data.map(({breed, country, origin, coat, pattern}) => Object({
                    name: Locale.get("command.cat.breeds.embed.field.name", breed),
                    value: Locale.get("command.cat.breeds.embed.field.value", [pattern||'?', country||'?', origin||'?', coat||'?']) + '\n\u200b',
                })).chunkOf(5);
                EmbedMenu({interaction, message, member, pages, LangToUse});
            break;
        }
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;





async function EmbedMenu({interaction, message, member, pages, LangToUse}) {
    const NohtingImage = 'https://media4.giphy.com/media/ES4Vcv8zWfIt2/giphy.gif';
    const TimeoutImage = 'https://media2.giphy.com/media/11dR2hEgtN5KoM/giphy.gif';

    // Embed de page
    const embed = new EmbedBuilder()
        .setTitle(Locale.get("command.cat.breeds.embed.title"))
        .setFields(pages[0])
        .setColor(Array.from(Array(3), () => getRandomRangeFloor(127,255)))
        .setFooter({text: Locale.get("command.cat.breeds.embed.footer", [client.user.username, client.config.version, 1, 1, pages.length])})
        .setTimestamp()
    ;

    // Define discordElement
    let discordElement = interaction || message;
    if (interaction) await interaction.deferReply();
    if (!discordElement) throw new Error("discordElement is not defined.");

    // Define menu's constants
    const uid = discordElement.id;
    const Speeds = [1,5,10];
    let page = 0;
    let pageSpeed = 0;

    // Send menu's message
    let MessageMenu = await discordElement[interaction ? 'editReply': 'reply']({ embeds: [embed], components: GetMenuButtons({uid, page, pageSize: pages.length, pageSpeed, LangToUse}) });
    
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
            description: Locale.get("command.cat.breeds.embed.closereason."+ reason),
            color: embed.color,
            image: { url: image[reason] },
        }]});
        await MessageMenu.react('🔒');
    });

    // Collect
    MenuCollector.on('collect', async (collectedInteraction) => {
        switch (collectedInteraction.customId.split(':')[1]) {
            case "cat-breed-page-left":
                page -= Speeds[pageSpeed];
                if (page < 0) page = 0;

                embed.setFields(pages[page]);
            break;
            
            case "cat-breed-page-speed-down":
                pageSpeed -= 1;
            break;
            
            case "cat-breed-page-speed-up":
                pageSpeed += 1;
            break;
            
            case "cat-breed-page-right":
                page += Speeds[pageSpeed];
                if (page > pages.length - 1) page = pages.length - 1;
                
                embed.setFields(pages[page]);
            break;
            
            case "cat-breed-page-goto":
                let value = await GetInput({
                    interaction: collectedInteraction,
                    title: Locale.get("command.cat.breeds.modal.goto.title"),
                    label: Locale.get("command.cat.breeds.modal.goto.label"),
                    placeholder: Locale.get("command.cat.breeds.modal.goto.placeholder", [1, pages.length]),
                    type: Number,
                    default: 0
                });
                page = value - 1;
                if (isNaN(value) || value < 1) page = 0;
                if (value > pages.length) page = pages.length - 1;
            break;
            
            case "cat-breed-button-close":
                return MenuCollector.stop();
            break;
        }

        // deferUpdate to avoid "an error has occured" on components.
        if (!collectedInteraction.deferred && !collectedInteraction.replied) await collectedInteraction.deferUpdate();
        
        // Update Footer (Spped : $0 | Page $1/$2)
        embed.setFooter({text: Locale.get("command.cat.breeds.embed.footer", [client.user.username, client.config.version, Speeds[pageSpeed], page+1, pages.length])});
        
        // Update menu.
        if (discordElement.editReply) { // interaction
            await discordElement.editReply({
                embeds: [ embed ], 
                components: GetMenuButtons({uid: discordElement.id, page, pageSize: pages.length, pageSpeed, LangToUse}),
            });
        } else { // message
            await MessageMenu.edit({
                embeds: [ embed ], 
                components: GetMenuButtons({uid: discordElement.id, page, pageSize: pages.length, pageSpeed, LangToUse}),
            });
        }
    });
}

function GetMenuButtons({uid, page, pageSize, pageSpeed, LangToUse}) {
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
                    customId: uid+":cat-breed-page-left",
                    style: ButtonStyle.Secondary,
                    emoji: Emotes.GetEmojiObject(EmojiLeft[pageSpeed]),
                    disabled: (page === 0 || pageSize < 10)
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":cat-breed-page-speed-down",
                    style: ButtonStyle.Secondary,
                    emoji: {name: '➖'},
                    disabled: (pageSpeed < 1)
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":cat-breed-page-goto",
                    style: ButtonStyle.Secondary,
                    emoji: Emotes.GetEmojiObject(Emotes.compass.black),
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":cat-breed-page-speed-up",
                    style: ButtonStyle.Secondary,
                    emoji: {name: '➕'},
                    disabled: (pageSpeed > 1)
                },
                {
                    type: ComponentType.Button,
                    customId: uid+":cat-breed-page-right",
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
                    customId: uid+":cat-breed-button-close",
                    label: Locale.get("command.cat.breeds.button.close"),
                    style: ButtonStyle.Secondary,
                    emoji: {name:'🔒'}
                },
            ]
        },
    ];
    if (pageSize === 1) ROWS.shift();

    return ROWS;
}

async function GetInput({ interaction, title = "\u200b", placeholder = "\u200b", label = "\u200b", type = String, default: default_value }) {
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
        console.error(`[ MODAL-ERROR : ${Date.timestamp()} ]`, error);
        return default_value;
    }
};