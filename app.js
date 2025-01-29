const { Client, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');
const config = require('./config');

// =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=
// { CLIENT BASE }

const client = new Client({
    intents: config.intents.map(intent => GatewayIntentBits[intent]),
    partials: config.partials.map(partial => Partials[partial])
});

// Globals Variables (in client)
client.config = { ...config };
client.APIs = [];
client.commands = [];
client.slashCommands = [];
client.hybridCommands = [];

// Connect the bot.
client.login(config.token);

// Custom internal permissions
client.PERMISSION = {};

client.PERMISSION.USER = 0;
client.PERMISSION.GUILD_MOD = 1;
client.PERMISSION.GUILD_ADMIN = 2;
client.PERMISSION.GUILD_OWNER = 3;

client.PERMISSION.ADMIN = 100;
client.PERMISSION.DEV = 101;
client.PERMISSION.OWNER = 102;

client.PERMISSION.ROOT = 5138416165912008019;

// Custom constants
client.CONSTANT = {};

client.CONSTANT.CHANNEL_CONFIG = {};
client.CONSTANT.CHANNEL_CONFIG.WHITELIST = 1;
client.CONSTANT.CHANNEL_CONFIG.BLACKLIST = 2;

// Export Client (thanks mr obvious)
module.exports = client;


const path = require('path');

// { LOAD MODULES }
require('./modules/FunctionsLoader');

const { Locale } = require('./modules/Locales');

fs.readdirSync('./assets/langs/').forEach(file => {
    if (file.endsWith('.json')) {
        let content = fs.readFileSync(path.join('./assets/langs/', file), 'utf-8');
        Locale.registerLocale(file.slice(0,-5), JSON.parse(content));
    }
});

Locale.setDefaultLang('fr');

// =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=
// { INITALIZE HANDLER }

// DefaultAssign : Assign deeply for application command options.
function DefaultFileAssign(file, defaultFile) {
    file = Object.assign({...defaultFile}, file);
    
    if ((file.options||[]).filter(option => ["SUB_COMMAND", "SUB_COMMAND_GROUP"].includes(option.type)).length > 0) {
        file.options = file.options.map(option => {
            if (["SUB_COMMAND", "SUB_COMMAND_GROUP"].includes(option.type)) return DefaultFileAssign(option, defaultFile);
            return option;
        });
    }

    return file;
};

// ===================================================================================================================
// [ Load Commands ]
client.commands = fs.readdirSync("./commands/message").filter(filename => filename.endsWith(".js")).map(filename => {
    file = require(`./commands/message/${filename}`);
    
    if (!file.name) return;
    if (!file.run) return;

    const defaultFile = {
        CommandType: "chat",
        name: null,
        version: 'unknow',
        syntax: '¯\\_(ツ)_/¯',
        aliases: [],
        userPermission: client.PERMISSION.USER,
        cooldown: 10,
        dm: false,
        category: 'unknow',
        file: `./commands/message/${filename}`
    };
    
    // Apply default structure.
    return DefaultFileAssign(file, defaultFile);
});
// ===================================================================================================================


// ===================================================================================================================
// [ Load Slash ]
client.slashCommands = fs.readdirSync("./commands/interaction").filter(filename => filename.endsWith(".js")).map(filename => {
    file = require(`./commands/interaction/${filename}`);
    
    if (!file.name) return;
    if (!file.run) return;

    const defaultFile = {
        CommandType: "slash",
        name: null,
        version: 'unknow',
        syntax: '¯\\_(ツ)_/¯',
        userPermission: client.PERMISSION.USER,
        cooldown: 10,
        category: 'unknow',
        file: `./commands/itneraction/${filename}`
    };
    
    // Apply default structure.
    return DefaultFileAssign(file, defaultFile);
});
// ===================================================================================================================

// ===================================================================================================================
// [ LOAD HYBRID COMMANDS ]
client.hybridCommands = fs.readdirSync("./commands/hybrid").filter(filename => filename.endsWith(".js")).map(filename => {
    file = require(`./commands/hybrid/${filename}`);
    
    const defaultFile = {
        CommandType: "hybrid",
        name: null,
        version: 'unknow',
        syntax: '¯\\_(ツ)_/¯',
        aliases: [],
        userPermission: client.PERMISSION.USER,
        cooldown: 10,
        hidden: false,
        dm: false,
        category: 'unknow',
        run: () => { },
        file: `./commands/hybrid/${filename}`
    };


    // Apply default structure.
    return DefaultFileAssign(file, defaultFile);
});
// ===================================================================================================================

// ===================================================================================================================
// [ Send Slash commands to discord's API ]
client.on("ready", async () => {
    // Register for all the guilds the bot is in
    function lowername(cmd) {
        let command = {...cmd};
        command.name = command.name.toLowerCase();
        return command;
    }

    await client.application.commands.set([].concat(client.slashCommands.map(lowername), client.hybridCommands.map(lowername)));
});
// ===================================================================================================================

// ===================================================================================================================
// [ Events ]
fs.readdirSync("./events").map(event => {
    const index = require(`./events/${event}`);
    try {
        client.on(event.split('.')[0], (...parameters) => index({client, parameters}))
    } catch (error) {
        console.error(error);
    }
});
// ===================================================================================================================

// =~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=~=



