const { ApplicationCommandType, ApplicationCommandOptionType, ComponentType, ButtonStyle, AttachmentBuilder, TextInputStyle } = require("discord.js");
const client = require("../../app");
const { BotError } = require("../../modules/Errors");
const { noop, MD5 } = require("../../modules/functions/Utils");

const fs = require('fs');
const path = require('path');
const { title } = require("process");
const { LocaleManager } = require("../../modules/Locales");

const CachedAttachments = new Map();
function GetAttachment(image) {
    if (image.base64) {
        let id = MD5(image.base64);
        if (CachedAttachments.has(id)) {
            return CachedAttachments.get(id);
        } else {
            let attachment = Base64ToAttachment(image.base64);
            CachedAttachments.set(id, attachment);
            return attachment;
        }
    } else
    if (image.file) {
        let id = MD5(image.file);

        if (CachedAttachments.has(id)) {
            return CachedAttachments.get(id);
        } else {
            let attachment = FileToAttachment(path.join('./assets/images/venture', image.file));
            if (!attachment) return null;

            CachedAttachments.set(id, attachment);
            return attachment;
        }
    }
    else {
        return null;
    }
}

function Base64ToAttachment(base64String, filename = 'image') {
    try {
        // Vérifier que la chaîne est au bon format (data:image/png;base64,...)
        const match = base64String.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!match) {
            throw new Error('Format de chaîne Base64 invalide.');
        }

        const mimeType = match[1];
        const data = match[2];
        const extension = mimeType.split('/')[1]; // Ex: "png"
        const buffer = Buffer.from(data, 'base64');

        // Créer et retourner l'attachement
        return new AttachmentBuilder(buffer, { name: `${filename}.${extension}` });
    } catch (error) {
        console.error('Erreur lors de la conversion Base64 en attachement :', error.message);
        return null;
    }
}

function FileToAttachment(file) {
    if (!fs.existsSync(file)) return null;

    let buffer = fs.readFileSync(file);
    return new AttachmentBuilder(buffer, { name: path.basename(file) });
}

async function getImageBufferFromUrl(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Erreur lors du téléchargement : ${response.statusText} (code ${response.status})`);
        }

        // Obtenez le type MIME pour construire la chaîne Base64
        const mimeType = response.headers.get('content-type'); // Exemple : "image/png"
        if (!mimeType || !mimeType.startsWith('image/')) {
            throw new Error('Le contenu téléchargé n\'est pas une image valide.');
        }
        

        // Utilisez arrayBuffer pour lire les données binaires
        const arrayBuffer = await response.arrayBuffer();
        let buffer = Buffer.from(arrayBuffer);

        const metadata = await sharp(buffer).metadata();

        const maxSize = 0.5 * 1024 * 1024; // 0.5 Mo en octets
        if (metadata.size > maxSize) {
            const factor = maxSize / metadata.size;
            
            if (metadata.width > metadata.height) {
                buffer = await sharp(buffer).resize({ width: Math.round(metadata.width * factor) }).toBuffer();
            } else {
                buffer = await sharp(buffer).resize({ height: Math.round(metadata.height * factor) }).toBuffer();
            }
        }

        return buffer;
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

async function ConvertUrlToBase64(url) {
    try {
        let buffer = getImageBufferFromUrl(url);
        if (!buffer) return null;
        
        const metadata = await sharp(buffer).metadata();

        // Convertissez le buffer en Base64
        const base64Data = buffer.toString('base64');
        const base64String = `data:image/${metadata.format};base64,${base64Data}`;

        // Retournez la chaîne en Base64
        return base64String;
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

async function ConvertUrlToFile(url) {
    try {
        let buffer = getImageBufferFromUrl(url);
        if (!buffer) return null;
        
        const metadata = await sharp(buffer).metadata();

        let filename = MD5(url + Math.random()) +'.'+ metadata.format;
        fs.writeFileSync(path.join('./assets/images/venture', filename), buffer);

        // Retournez la chaîne en Base64
        return filename;
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

async function ConvertBase64ToFile(base64) {
    try {
        const match = base64String.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
        if (!match) {
            throw new Error('Format de chaîne Base64 invalide.');
        }

        const mimeType = match[1];
        const data = match[2];
        const extension = mimeType.split('/')[1]; // Ex: "png"
        const buffer = Buffer.from(data, 'base64');

        if (!buffer) return null;

        let filename = MD5(url + Math.random()) +'.'+ extension;
        fs.writeFileSync(path.join('./assets/images/venture', filename), buffer);

        return filename;
    } catch (error) {
        console.error('Erreur:', error);
        return null;
    }
}

module.exports = {
    name: "Venture",
    aliases: ['v'],
    userPermission: client.PERMISSION.USER,
    type: ApplicationCommandType.ChatInput,
    options: [
        // {
        //     type: ApplicationCommandOptionType.Subcommand,
        //     name: "config",
        //     aliases: ['c', 'conf', 'cfg'],
        //     description: Locale.get(`commandinfo.venture.option.config.description`),
        // },
        {
            type: ApplicationCommandOptionType.Subcommand,
            name: "play",
            description: Locale.get(`commandinfo.venture.option.play.description`),
        },
    ],
    run: async ({client, interaction, message, args, userPermissionLevel, GuildData, UserData, LangToUse }) => {
        let discordElement = message ?? interaction;
        let { member } = discordElement;

        let subcommand = args.shift();
        if (!subcommand) subcommand = "start";

        switch (subcommand.toLowerCase().simplify()) {
            case "start":
                await VentureCore({ discordElement, GuildData, UserData });
                if (message) message.delete().catch(noop);
            break

            default:
                discordElement.reply({ content: `Unknown sub-command '${subcommand}'` });
            
        }
    },
};
module.exports.description = Locale.get(`commandinfo.${module.exports.name}.description`) || 'No description';
module.exports.syntax = Locale.get(`commandinfo.${module.exports.name}.syntax`) || client.config.prefix + module.exports.name;

function LoadLocaleVentureFile(filename) {
    let raw = fs.readFileSync(`./assets/ventures/${filename}.json`, 'utf8');
    return JSON.parse(raw);
}

async function VentureCore({ discordElement, GuildData, UserData }) {
    // let loadingEmoteMessage = await discordElement.channel.send(Emotes.loading);

    const VentureMenu = new DiscordMenu({
        element: discordElement,
        ephemeral: true,
        collectorOptions: {
            idle: 7_200_000 // 2H
        },
        onEnd: function() {},
        locales: new LocaleManager(),
        data: {
            methods: {
                ValidateGameData: function(gamedata) {

                },
                validator: {
                    defined: function(v) {
                        return typeof v !== "undefined";
                    },
                    variable(str) {
                        return /^(random|(stats|variables|inventory)\.[A-z]+[A-z0-9]*)$/.test(str);
                    },
                    array: function(v) {
                        return Array.isArray(v);
                    },
                    object: function(v) {
                        return typeof v === "object" && !Array.isArray(v);
                    },
                    string: function(str) {
                        if (typeof str !== 'string') return false;
                        if (str.length < 1) return false;
                        return true;
                    },
                    number: function(n) {
                        if (typeof n !== 'number') return false;
                        if (isNaN(n) || !isFinite(n)) return false;
                        if (n === null) return false;
                        return true;
                    },
                    positiveNumber: function(n) {
                        if (!this.methods.validator.number(n)) return false;
                        if (n < 0) return false;
                        return true;
                    },
                    range: function(data) {
                        let { defined, number, roundmethod, positiveNumber } = this.methods.validator;
                        let { min, max, precision, round } = data;

                        if (!number(min) && !number(max)) return false;
                        if (number(min) && !number(max)) return false;
                        if (defined(precision) && !positiveNumber(precision)) return false;
                        if (defined(round) && !roundmethod(round)) return false;

                        return true;
                    },
                    operation: function(operande) {
                        if (!this.methods.validator.string(operande)) return false;
                        return ["set", "add", "remove", "multiply", "devide"].includes(operande);
                    },
                    roundmethod: function(m) {
                        if (!this.methods.validator.string(m)) return false;
                        return ["round", "floor", "ceil"].includes(m);
                    },
                    requirement: function(requirement) {
                        const { defined, string, object, array } = this.methods.validator;

                        if (!object(requirement)) return false;
                        if (!string(requirement.type)) return false;
                        
                        if (["AND", "OR"].includes(requirement.type)) {
                            if (!array(requirement.requirements)) return false;
                            return requirement.requirements.every(r => {
                                return this.methods.validator.requirement.call(this, r);
                            });
                        } else
                        
                        if (["comparison"].includes(requirement.type)) {
                            if (!defined(requirement.left)) return false;
                            if (!string(requirement.operator)) return false;
                            if (!defined(requirement.right)) return false;

                            if (!["==", "!=", "<=", ">=", "<", ">", "includes"].includes(requirement.operator)) return false;
                            return true;
                        } else
                        
                        return false;
                    },
                    procedure: function(procedure) {
                        const { validator } = this.methods;

                        if (!validator.string(procedure.id)) return false;
                        if (!validator.array(procedure.actions)) return false;

                        if (validator.array(procedure.requirements)) {
                            if (!procedure.requirements.every(r => validator.requirement(r))) {
                                return false;
                            }
                        };

                        return true;
                    },
                    reward: function(reward) {
                        const { validator } = this.methods;
                        if (!validator.string(reward.id)) return false;
                        return true;
                    },
                    variable: function(value) {
                        if (!this.methods.validator.string(value)) return false;
                        if (value === 'random') return true;
                        return /^(stats|variables|inventory)\..+$/gi.test(value);
                    },
                },
                parseLogicalExpression(input) {
                    const logicalRegex = /(\(|\)|\|\||&&|[A-z0-9]+\.[A-z0-9]+|[0-9]+|[0-9]+\.[0-9]+|[\/\*\-\+\%]|round|ceil|floor|pow|srqt|includes|random)/g;

                    function tokenize(expression) {
                        return expression.split(logicalRegex).map(token => token.trim()).filter(Boolean);
                    }

                    function toPostfix(tokens) {
                        const output = []; // La sortie (notation postfix)
                        const operators = []; // La pile d'opérateurs
                        const precedence = {
                            '||': 1,
                            '&&': 2,
                            '==': 3, '!=': 3, '<': 3, '>': 3, '<=': 3, '>=': 3, 'includes': 3,
                            '+': 4, '-': 4,
                            '*': 5, '/': 5, '%': 5, 
                            '(': 6, ')': 6,
                        };
                    
                        // Fonction pour vérifier si un token est un opérateur
                        function isOperator(token) {
                            return ['||', '&&', '==', '!=', '<', '>', '<=', '>=', 'includes', '+', '-', '*', '/', '%'].includes(token);
                        }
                    
                        // Fonction pour comparer la priorité des opérateurs
                        function precedenceOf(op) {
                            return precedence[op] || 0;
                        }
                    
                        // Parcours des tokens
                        tokens.forEach(token => {
                            if (/\d+(\.\d+)?/.test(token) || /\w+(\.\w+)?/.test(token)) {
                                // Si le token est un nombre ou une variable (nom de fonction ou variable)
                                output.push(token);
                            } else if (token === '(') {
                                // Si le token est une parenthèse ouvrante
                                operators.push(token);
                            } else if (token === ')') {
                                // Si le token est une parenthèse fermante
                                while (operators.length && operators[operators.length - 1] !== '(') {
                                    output.push(operators.pop());
                                }
                                operators.pop();  // Enlève la parenthèse ouvrante
                            } else if (isOperator(token)) {
                                // Si le token est un opérateur
                                while (operators.length && precedenceOf(operators[operators.length - 1]) >= precedenceOf(token)) {
                                    output.push(operators.pop());
                                }
                                operators.push(token);
                            }
                        });
                    
                        // Vidage de la pile des opérateurs
                        while (operators.length) {
                            output.push(operators.pop());
                        }
                    
                        return output;
                    }

                    function build(postfix) {
                        const stack = [];
                    
                        // Fonction pour gérer les opérateurs et générer les objets de comparaison ou logique
                        function createComparison(left, operator, right) {
                            return {
                                type: 'comparison',
                                left: left,
                                operator: operator,
                                right: right
                            };
                        }
                    
                        function createLogical(type, left, right) {
                            return {
                                type: type,
                                requirements: [left, right]
                            };
                        }
                    
                        postfix.forEach(token => {
                            if (/\w+(\.\w+)?/.test(token) || /\d+(\.\d+)?/.test(token)) {
                                // Si le token est une variable ou une valeur numérique, l'ajouter à la pile
                                stack.push(token);
                            } else if (['>', '<', '>=', '<=', '==', '!=', 'includes'].includes(token)) {
                                // Si c'est un opérateur de comparaison
                                const right = stack.pop();
                                const left = stack.pop();
                                stack.push(createComparison(left, token, right));
                            } else if (['&&', '||'].includes(token)) {
                                // Si c'est un opérateur logique (AND/OR)
                                const right = stack.pop();
                                const left = stack.pop();
                                stack.push(createLogical(token === '&&' ? 'AND' : 'OR', left, right));
                            }
                        });
                    
                        // Le dernier élément dans la pile est le résultat final
                        return stack.pop();
                    }
                    
                    const tokens = tokenize(input);
                    const postfix = toPostfix(tokens);
                    const builded = build(postfix);
                    return builded;
                },
                variable: function(str) {
                    if (!this.methods.validator.string(str)) return str;
                    
                    function evaluate(str) {
                        try {
                            return (Function([
                                "const round = (v) => Math.round(v);",
                                "const ceil = (v) => Math.ceil(v);",
                                "const floor = (v) => Math.floor(v);",
                                "const pow = (v,p) => Math.pow(v,p);",
                                "const sqrt = (v,p) => Math.sqrt(v);",
                                "return " + str
                            ].join("")))();
                        } catch (e) {
                            console.error(e);
                            return null;
                        }
                    }

                    // Remplace les variables
                    let parsed = str.replace(/(stats|variables|inventory)\.([A-z]+[A-z0-9]*)/g, (match, category, variable) => this.data._game[category][variable]);

                    // Remplace les 'random'
                    while (/random/.test(parsed)) {
                        parsed = parsed.replace(/random/, Math.random())
                    }

                    // Evalue les expression mathématique
                    let reg = /(round|ceil|floor|sqrt){0,1}\([0-9\/\*\-\+\.\%\s]+\)|pow\([0-9\/\*\-\+\.\%\s]+,\s*[0-9\/\*\-\+\.\%\s]+\)/g;
                    while (reg.test(parsed)) {
                        parsed = parsed.replace(reg, m => evaluate(m))
                    }

                    // Vérifie si il reste autre chose que des valeurs numériques dans l'expression
                    // if (/[^0-9\/\*\-\+\.\%\s\(\)]/gi.test(parsed)) {
                    //     throw new BotError("VENTURE_VARIABLE_UNSAFE_EXPRESSION", parsed);
                    // }

                    // Evalue l'expression finale
                    return parsed;
                },
                range: function(range) {
                    let { validator } = this.methods;
                    if (!validator.range(range)) throw new BotError("VENTURE_INVALID_RANGE_OBJECT");

                    let { min, max, precision, round } = range;

                    if (!validator.number(min) && validator.number(max)) min = 0;
                    if (min > max) [min, max] = [max, min];

                    let value = Math.random() * (max - min) + min;

                    let validRound = validator.roundmethod(round);
                    let validPrecision = validator.positiveNumber(precision);

                    if (validRound || validPrecision) {
                        let factor = validPrecision ? Math.pow(10, Number(precision)) : 1;
                        return Math[validRound ? round : 'round'](value * factor ) / factor;
                    } else {
                        return value;
                    }
                },
                requirements: function(requirements) {
                    const { validator, parseLogicalExpression } = this.methods;

                    if (validator.string(requirements)) { // Parse ExpressionString
                        requirements = parseLogicalExpression(requirements);
                    }

                    // Fonction pour interpréter un objet VentureRequirement
                    const check = (requirement) => {
                        if (requirement.type === "AND") {
                            return requirement.requirements.every(req => check(req));
                        } else
                        
                        if (requirement.type === "OR") {
                            return requirement.requirements.some(req => check(req));
                        } else
                        
                        if (requirement.type === "comparison") {
                            const leftValue = this.methods.variable(requirement.left) ?? 0;
                            const rightValue = this.methods.variable(requirement.right) ?? 0;

                            switch (requirement.operator) {
                                case "==": return leftValue == rightValue;
                                case "!=": return leftValue != rightValue;
                                case "<": return leftValue < rightValue;
                                case ">": return leftValue > rightValue;
                                case "<=": return leftValue <= rightValue;
                                case ">=": return leftValue >= rightValue;
                                case "includes": return Array.isArray(leftValue) && leftValue.includes(rightValue);
                                default: return false;
                            }
                        }
                
                        return false;
                    }

                    if (validator.array(requirements)) {
                        if ( requirements.every(req => validator.requirement(req)) ) {
                            return requirements.every(req => check(req));
                        }

                        return false
                    } else
                    
                    if (validator.requirement(requirements)) {
                        return check(requirements)
                    }
                
                    return false;
                },
                actions: async function(data) {
                    let { validator } = this.methods;

                    const operation = ({ left, right, operator, round, precision }) => {
                        left = validator.defined(left) 
                            ? validator.variable(left)
                                ? this.methods.variable(left)
                                : validator.range(left)
                                    ? this.methods.range(left)
                                    : left
                            : 0
                        ;
                        
                        right = validator.defined(right) 
                            ? validator.variable(right)
                                ? this.methods.variable(right)
                                : validator.range(right)
                                    ? this.methods.range(right)
                                    : right
                            : 0
                        ;

                        operator = operator || "set";
                
                        let value;
                        switch (operator) {
                            case "set": value = right; break;
                            case "add": value = left + right; break;
                            case "remove": value = left - right; break;
                            case "multiply": value = left * right; break;
                            case "divide": value = right !== 0 ? left / right : NaN; break;
                            case "modulo": value = right !== 0 ? left % right : NaN; break;
                            case "power": value = Math.pow(left, right); break;
                            case "sqrt": value = Math.sqrt(left); break;
                            default: throw new BotError("VENTURE_ACTION_INVALID_OPERATION", { left, right, operator });
                        }
                
                        // Handle rounding and precision
                        if (validator.defined(round) || validator.defined(precision)) {
                            const roundingMethod = validator.roundmethod(round) ? round : "round"; // Default to Math.round
                            const factor = validator.positiveNumber(precision) ? Math.pow(10, Number(precision)) : 1;
                            return Math[roundingMethod](value * factor) / factor;
                        }
                
                        return value;
                    };

                    // Validation logic for action properties
                    const validateAction = (action, requiredProps) => {
                        for (const prop of requiredProps) {
                            if (!validator.defined(action[prop])) {
                                throw new BotError(`VENTURE_ACTION_MISSING_PROPERTY`, { action, missing: prop });
                            }
                        }
                    };

                    for (const action of data.actions) {
                        const type = action.type.toLowerCase();
                
                        if (type === "inventory") {
                            validateAction(action, ["item", "count", "action"]);
                            this.data._game.inventory[action.item] = operation({
                                left: this.data._game.inventory[action.item],
                                right: action.count,
                                operator: action.action,
                                round: action.round,
                                precision: action.precision
                            });
                        } else
                        if (type === "condition") {
                            validateAction(action, ["requirements", "success", "fail"]);
                            const successful = this.methods.requirements(action.requirements);
                            this.methods.actions(successful ? { actions: action.success } : { actions: action.fail });
                        } else
                        if (type === "stat") {
                            validateAction(action, ["name", "value", "operator"]);
                            this.data._game.stats[action.name] = operation({
                                left: this.data._game.stats[action.name],
                                right: action.value,
                                operator: action.operator,
                                round: action.round,
                                precision: action.precision
                            });
                        } else
                        if (type === "goto") {
                            validateAction(action, ["target"]);

                            let index = this.data.game.situations.findIndex(s => s.id == action.target);
                            if (index < 0) {
                                this.data._error = {
                                    error: 'UNKNOWN_SITUATION',
                                    from: this.data._game.situation,
                                    option: data,
                                    target: action.target
                                };
                                this.goto('game-error');
                            } else {
                                this.data._game.situationindex = index;
                                this.data._game.situation = this.data.game.situations[index];
                            }
                        } else
                        if (type === "variable") {
                            validateAction(action, ["name", "value", "operator"]);
                            this.data._game.variables[action.name] = operation({
                                left: this.data._game.variables[action.name],
                                right: action.value,
                                operator: action.operator,
                                round: action.round,
                                precision: action.precision
                            });
                        } else
                        if (type === "procedure") {
                            validateAction(action, ["id"]);
                            let { procedures } = this.data.game;

                            if (validator.array(procedures)) {
                                let foundProcedure = procedures.find(p => p.id == action.id);
                                if (foundProcedure) {
                                    if (validator.procedure(foundProcedure)) {
                                        let check = foundProcedure.requirements ? this.methods.requirements(foundProcedure.requirements) : true;
                                        if (check) {
                                            this.methods.actions(foundProcedure.actions);
                                        }
                                    } else {
                                        this.data._error = {
                                            error: 'INVALID_PROCEDURE',
                                            from: this.data._game.situation,
                                            procedure: action.id
                                        };
                                        this.goto('game-error');
                                    }

                                } else {
                                    this.data._error = {
                                        error: 'UNKNOWN_PROCEDURE',
                                        from: this.data._game.situation,
                                        procedure: action.id
                                    };
                                    this.goto('game-error');
                                }
                            }
                        } else
                        if (type === "reward") {
                            validateAction(action, ["id"]);
                            let { rewards } = this.data.game;

                            if (validator.array(rewards)) {
                                let foundReward = rewards.find(r => r.id == action.id);
                                if (foundReward) {
                                    if (validator.reward(foundReward)) {
                                        // Grand if not already granted
                                        if (!this.data.player.rewards.find(r => r.id == foundReward.id)) {
                                            this.data.player.rewards.push(foundReward);

                                            // Notify
                                            const attachement = GetAttachment(foundReward.image ?? {});

                                            const embed = {
                                                title: foundReward.title ?? null,
                                                description: foundReward.description ?? null,
                                                image: {
                                                    url: foundReward.image ? ( foundReward.image.url ? foundReward.image.url : attachement ? `attachment://${attachement.name}` : null ) : null, 
                                                },
                                                footer: {
                                                    text: `From Venture : ${this.data.game.name}`
                                                },
                                                color: foundReward.color ?? 0x5865F2,
                                                timestamp: new Date(),
                                            };
                                            
                                            this.element.member.send({
                                                files: [ attachement ].filter(s => s),
                                                embeds: [ embed ]
                                            }).catch(noop);
                                        }
                                    } else {
                                        this.data._error = {
                                            error: 'INVALID_REWARD',
                                            from: this.data._game.situation,
                                            reward: action.id
                                        };
                                        this.goto('game-error');
                                    }
                                } else {
                                    this.data._error = {
                                        error: 'UNKNOWN_REWARD',
                                        from: this.data._game.situation,
                                        reward: action.id
                                    };
                                    this.goto('game-error');
                                }
                            }
                        } else
                        if (type === "end") {
                            this.data.player.data = null;
                            await this.methods.save();
                            this.goto('game-settings');
                        } else {
                            throw new BotError("VENTURE_UNKNOWN_ACTION_TYPE", { action });
                        }
                    }
                },
                splitText: function(input, maxLength = 1024) {
                    const result = [];
                    let currentChunk = "";
                
                    for (const word of input.split(/\s+/gi)) {
                        if ((currentChunk + word).length > maxLength) {
                            result.push(currentChunk.trim());
                            currentChunk = word + " ";
                        } else {
                            currentChunk += word + " ";
                        }
                    }
                
                    if (currentChunk.trim()) {
                        result.push(currentChunk.trim());
                    }
                
                    return result;
                },
                loadSave: async function(savestat) {
                    let {inventory, stats, variables, situation: situation_id} = savestat.data;

                    this.data._game.variables = variables;
                    this.data._game.stats     = stats;
                    this.data._game.inventory = inventory;

                    this.data._game.situationindex = this.data.game.situations.findIndex(s => s.id == situation_id);
                    this.data._game.situation = this.data.game.situations[this.data._game.situationindex];

                    this.data.player.data = {
                        history: this.data._game.history,
                        situation: this.data._game.situation?.id,
                        inventory, stats, variables
                    };
                },
                save: async function() {
                    if (this.data.player !== null) {
                        let {history, inventory, stats, variables, situation} = this.data._game;

                        this.data.player.data = {
                            history,
                            situation: situation.id,
                            inventory, stats, variables
                        };

                        await this.data.player.save();
                    }
                },
            },
            _game: {
                history: [],
                inventory: {},
                stats: {},
                variables: {},
            },
            _error: {},
            player: null,
            game: null
        },
        pages: [
            {
                name: "home",
                embeds: function() {
                    return [{
                        description: "**Venture** est un système d'histoires à choix intégrant une dimension RPG, combinant narration interactive, gestion d'inventaire et statistiques.\nIl permet de créer des aventures où les décisions des joueurs influencent l'évolution de l'histoire, tout en offrant des mécaniques de jeu telles que la gestion des ressources et des compétences.\nCe mélange unique entre récit et gameplay rend Venture idéal pour des expériences immersives et personnalisées.",
                        // fields: [],
                        image: {
                            url: "https://cdn.discordapp.com/attachments/1321992074689511544/1321992084177027102/image.png"
                        },
                        fields: [
                            {
                                name: "ToDo",
                                value: [
                                    "- Full Translation Support",
                                    "  - Manque : venture name (game-select)",
                                    "- Venture Author Viewer",
                                    "- Venture Rewards Viewer",
                                    "- Venture Editor",
                                    "  - Permettra de créer des ventures",
                                    "- Peaufiner les interfaces",
                                    "- Ecrire une venture démonstrative avec toutes les dernières nouveautées",
                                ].join('\n'),
                            },
                            {
                                name: "Informations",
                                value: [
                                    "- Vous êtes libres d'écrire des histoires",
                                    "  Pour le moment l'éditeur n'est pas fonctionnel mais la création manuelle fonctionne",
                                    "  - histoire de tout type, de toute durée",
                                    "- Je suis ouvert aux suggestions et aux retours, n'hésitez surtout pas!",
                                ].join('\n'),
                            }
                        ],
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    return [
                        [
                            { emoji: "🕹", label: "Choisir un jeu", action: "goto:game-select", style: ButtonStyle.Primary },
                            { emoji: "🔒", label: "Fermer", action: "stop", style: ButtonStyle.Danger },
                        ]
                    ]
                }
            },
            {
                name: "game-select",
                beforeUpdate: function() {
                    if (typeof this.data._select) {
                        this.data._select = {
                            selectpage: 0
                        }
                    }

                    let ventures = fs.readdirSync('./assets/ventures/').filter(f => path.parse(f).ext == '.json').map(filename => ({
                        id: path.parse(filename).name,
                        data: JSON.parse(fs.readFileSync(path.join('./assets/ventures', filename), 'utf-8'))
                    }));

                    this.data._ventures = ventures;
                },
                embeds: function() {
                    let ventures = this.data._ventures;
                    let VenturesPages = ventures.chunkOf(25);

                    return [{
                        title: "Game Select",
                        fields: [
                            {
                                name: "Ventures disponibles :",
                                value: `Il existe ${ventures.length} venture(s)`,
                            },
                            {
                                name: "\u200b",
                                value: VenturesPages[this.data._select.selectpage].map(((v,i) => `${(i + 1) + (25 * this.data._select.selectpage)}. ${v.data.name ?? v.id}`)).join('\n'),
                            },
                        ],
                        image: {
                            url: "https://cdn.discordapp.com/attachments/1321992074689511544/1322009921335857192/image.png"
                        },
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    let ventures = this.data._ventures;

                    let VenturesPages = ventures.chunkOf(25);

                    let hasAnyGame = ventures.length > 0;
                    let hasMultiplePages = VenturesPages.length > 1;

                    return [
                        [
                            {
                                type: ComponentType.StringSelect,
                                placeholder: "Selectionne une Venture",
                                options: hasAnyGame
                                    ? VenturesPages[this.data._select.selectpage].map((venture, index) => ({
                                        label: `[${(index + 1) + (25 * this.data._select.selectpage)}] ${venture.data.name ?? venture.id}`,
                                        value: venture.id
                                    }))
                                    : { label: "No choice available", value: 'MISSINGNO', default: true }
                                ,
                                action: function(interaction) {
                                    this.data._game.id = interaction.values[0];
                                    this.data.game = ventures.find(v => v.id == interaction.values[0])?.data;

                                    // Init Locales Provider
                                    let { translated, translations } = this.data.game;
                                    if (translated) {
                                        this.locales.registerLocales(translations ?? {});
                                    }

                                    // Delete Temps Vars
                                    delete this.data._ventures;
                                    delete this.data._z;

                                    this.goto('game-settings');
                                    return true;
                                },
                            }
                        ],
                        [
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.left.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._select.selectpage = Math.clamp((this.data._select.selectpage || 0) - 1, 0, VenturesPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._select.selectpage < 1
                            },
                            {
                                label: `${this.data._select.selectpage + 1}/${VenturesPages.length}`,
                                action: async function(interaction) {
                                    let modal = new ModalForm({ title: "Aller à la page", time: 120_000 })
                                        .addRow().addTextField({ name: 'number', label: "Numéro de la page", placeholder: (this.data._select.selectpage ?? 0) + 1 })
                                    ;
                                    
                                    let result = await modal.setInteraction(interaction).popup();
                                    if (!result || isNaN(result.get('number'))) return false;
    
                                    this.data._select.selectpage = Math.clamp((this.data._select.selectpage || 0) + 1, 0, VenturesPages.length - 1);
    
                                    return true;
                                },
                                style: ButtonStyle.Secondary,
                                disabled: !hasMultiplePages
                            },
                            {
                                emoji: Emotes.GetEmojiObject(Emotes.chevron.black.right.simple),
                                label: "\u200b",
                                action: function() {
                                    this.data._select.selectpage = Math.clamp((this.data._select.selectpage || 0) + 1, 0, VenturesPages.length - 1);
                                    return true;
                                },
                                disabled: !hasMultiplePages || this.data._select.selectpage >= (VenturesPages.length - 1) 
                            },
                        ]
                    ];
                },
            },
            {
                name: "game-settings",
                beforeUpdate: async function() {
                    let { validator } = this.methods;

                    let query = { id: UserData.id, venture: this.data._game.id };
                    if (await Manager.venture.player.exist(query)) {
                        this.data.player = await Manager.venture.player.get(query);
                    } else {
                        this.data.player = await Manager.venture.player.create(query);
                    }

                    let image = this.data.game.image;
                    
                    this.data._attachment = [];
                    if (validator.object(image)) {
                        let { base64, file } = image;
                        
                        if (validator.string(base64) || validator.string(file)) {
                            this.data._attachment.push( GetAttachment({ base64, file }) );
                        }
                    }
                },
                files: function() {
                    return this.data._attachment ?? [];
                },
                embeds: function() {
                    let { image, translated } = this.data.game;

                    return [{
                        title: "Game Settings",
                        description: this.data._z ? "**🫥 ATTENTION EN APPUYANT DE NOUVEAU SUR `NOUVELLE PARTIE` TA SAUVEGARDE EN COURS SERA SUPPRIMÉE 🫥**" : null,
                        image: {
                            url: image ? ( image.url ? image.url : this.data._attachment ? `attachment://${this.data._attachment[0].name}` : null ) : null, 
                        },
                        fields: this.methods.splitText((translated ? this.locales.get("venture.presentation") : this.data.game.presentation ?? ''), 1024).map((text, index) => ({
                            name: index == 0 ? 'Présentation de La Venture' : '\u200b',
                            value: text
                        })),
                        color: 0x5865F2,
                    }];
                },
                components: function() {
                    return [
                        [
                            {
                                emoji: "✨",
                                label: "Nouvelle partie",
                                action: function() {
                                    if (this.data.player.data !== null) {
                                        if (!this.data._z) { // Shunt de confirmation avant override
                                            this.data._z = true;
                                            return true;
                                        } else {
                                            delete this.data._z;
                                        };
                                    }

                                    if (this.data.game.initialization) {
                                        let { situation, stats, inventory, variables } = this.data.game.initialization;
                                        let actions = [];
                                        
                                        if (situation) {
                                            actions.push({ type: "goto", target: situation });
                                        } else {
                                            this.data._game.situation = this.data.game.situations[0];
                                        }

                                        if (variables) {
                                            Object.keys(variables).forEach(key => actions.push({ type: "variable", name: key, value: variables[key], operator: 'set'}));
                                        }

                                        if (stats) {
                                            Object.keys(stats).forEach(key => actions.push({ type: "stat", name: key, value: stats[key], operator: 'set'}));
                                        }

                                        if (inventory) {
                                            Object.keys(inventory).forEach(key => actions.push({ type: "inventory", item: key, count: inventory[key], action: 'set'}));
                                        }

                                        this.methods.actions({actions});
                                    } else {
                                        this.data._game.situation = this.data.game.situations[0];
                                    }

                                    this.goto("game-run");                                    
                                    
                                    return true;
                                }
                            },
                            {
                                emoji: "▶",
                                label: "Continuer la partie",
                                action: function() {
                                    this.methods.loadSave(this.data.player);
                                    this.goto('game-run');
                                    return true
                                },
                                disabled: this.data.player.data === null
                            },
                        ],
                        [
                            { label: "Retour", action: "goto:game-select" },
                            { label: "Menu principal", action: "goto:home" },
                            { emoji: "🔒", label: "Fermer", action: "close", style: ButtonStyle.Danger },
                        ],
                    ]
                }
            },
            {
                name: "game-run",
                beforeUpdate: function() {
                    let { image } = this.data._game.situation;
                    let { validator } = this.methods;
                    
                    this.data._attachment = [];
                    if (validator.object(image)) {
                        let { base64, file } = image;
                        
                        if (validator.string(base64) || validator.string(file)) {
                            this.data._attachment.push( GetAttachment({ base64, file }) );
                        }
                    }
                },
                files: function() {
                    return this.data._attachment ?? [];
                },
                embeds: function() {
                    let { translated } = this.data.game;

                    const resolvePlaceholders = (str) => {
                        return str.replace(/\%(stats|variables|inventory)\.[A-z]+[A-z0-9]*\%/g, (m) => this.methods.variable(m.slice(1,-1)));
                    }

                    let situation = this.data._game.situation;
                    let { image } = situation;

                    let options = situation.options.map(option => ({
                        name: resolvePlaceholders(translated ? this.locales.get(option.label) : option.label),
                        value: option.details ? resolvePlaceholders(translated ? this.locales.get(option.details) : option.details) : `\u200b`,
                        inline: true,
                    }));

                    return [{
                        title: resolvePlaceholders(translated ? this.locales.get(this.data.game.name) : this.data.game.name),
                        description: situation.description ? resolvePlaceholders(translated ? this.locales.get(situation.description) : situation.description) : null,
                        image: {
                            url: image ? ( image.url ? image.url : this.data._attachment ? `attachment://${this.data._attachment[0].name}` : null ) : null, 
                        },
                        fields: options,
                        color: situation.color ?? 0x5865F2,
                    }];
                },
                components: function() {
                    let { translated } = this.data.game;
                    
                    let {inventory, stats, variables, situation} = this.data._game;

                    let rows = situation.options.map(option => {
                        let hasRequirements = true;
                        if (this.methods.validator.array(option.requirements)) {
                            hasRequirements = this.methods.requirements(option.requirements);
                        }

                        let isHidden = false;
                        if (this.methods.validator.array(option.hidden)) {
                            isHidden = this.methods.requirements(option.hidden);
                        }

                        return {
                            label: translated ? '...' : option.label,
                            disabled: !hasRequirements,
                            hidden: isHidden,
                            action: async function() {
                                this.data._option = option;

                                this.data._game.history.push({
                                    timestamp: Date.time(),
                                    situation: situation.id,
                                    data: {inventory, stats, variables},
                                });

                                try {
                                    await this.methods.actions(option);
                                } catch (err) {
                                    this.data._error = err;
                                    this.goto('game-fatal-error');
                                }

                                return true;
                            }
                        }
                    }).filter(button => !button.hidden).chunkOf(5);

                    return [
                        rows,
                        [
                            {
                                label: "Menu principal",
                                action: async function() {
                                    await this.methods.save();
                                    this.goto("home");
                                    return true;
                                }
                            },
                            // {
                            //     label: "DEBUG",
                            //     action: async function() {
                            //         console.blank(2);
                            //         console.inspect(this.data);
                            //         console.blank(2);

                            //         fs.writeFileSync("./debug.txt", JSON.stringify(this.data, null, 2));

                            //         return false;
                            //     }
                            // },
                        ]
                    ]
                }
            },
            {
                name: "game-error",
                beforeUpdate: async function() {
                    await this.methods.save();
                },
                files: function() {
                    let {error, from} = this.data._error;
                    let { validator } = this.methods;
                    
                    let details = Object.keys(this.data._error).filter(k => !['error', 'from'].includes(k));

                    let string = [
                        "ERROR :", error, '',
                        "FROM SITUATION :", JSON.stringify(from, null, 2), '',
                        details.flatMap(key => {
                            return [ key.toUpperCase(), !validator.number() && !validator.string() ? JSON.stringify(this.data._error[key], null, 2) : this.data._error[key], '' ];
                        }),
                    ].flat().join('\n');

                    const buffer = Buffer.from(string, 'utf-8');
                    let attachment = new AttachmentBuilder(buffer, { name: `error.txt` });
                    
                    return [ attachment ];
                },
                embeds: function() {
                    let {error, from} = this.data._error;

                    const limit = (str) => str.length > 100 ? str.slice(0,100) + '…' : str;

                    let stringifiedFrom = JSON.stringify(from, null, 2);
                    if (stringifiedFrom.length > 1015) {
                        let ffrom = JSON.parse(stringifiedFrom);

                        ffrom.description = limit(ffrom.description);
                        delete ffrom.image;
                        
                        ffrom.options = ffrom.options.map(o => {
                            return limit(o.label);
                        });

                        stringifiedFrom = JSON.stringify(ffrom, null, 2);
                    }
                    if (stringifiedFrom.length > 1015) {
                        stringifiedFrom = stringifiedFrom.slice(0, 1010) + "…";
                    }

                    let stringifiedOption = JSON.stringify(this.data._option, null, 2);
                    if (stringifiedOption.length > 1015) {
                        let ooption = JSON.parse(stringifiedOption);

                        ooption.label = limit(ooption.label);
                        ooption.actions = ooption.actions?.map(o => `type:${o.type}`);

                        stringifiedOption = JSON.stringify(ooption, null, 2);
                    }
                    if (stringifiedOption.length > 1015) {
                        stringifiedOption = stringifiedOption.slice(0, 1010) + "…";
                    }

                    return [{
                        title: error ?? "Aïe aïe aïe !",
                        description: `Une erreur est survenue pendant ta venture ...`,
                        fields: [
                            {
                                name: `Situation :`,
                                value: "```js\n"+ stringifiedFrom +"\n```"
                            },
                            {
                                name: `Option :`,
                                value: "```js\n"+ stringifiedOption +"\n```"
                            },
                            {
                                name: `Details :`,
                                value: "You can find more details in `error.txt`"
                            },
                        ],
                        color: 0xFF3A41,
                        timestamp: new Date(),
                    }];
                },
                components: function() {
                    return [
                        [
                            {
                                emoji: '💾',
                                label: "Charger le dernière sauvegarde",
                                action: async function() {
                                    let savestat = this.data._game.history.pop();
                                    
                                    this.methods.loadSave(savestat);

                                    this.goto('game-run');

                                    return true;
                                }
                            },
                            { label: "Menu principal", action: "goto:home" }
                        ]
                    ]
                }
            },
            {
                name: "game-fatal-error",
                beforeUpdate: async function() {
                    await this.methods.save();
                },
                afterUpdate: async function() {
                    await this.message.react("🔒");
                    await this.message.react(Emotes.crossmark);

                    this.deleteOnClose = false;
                    this.collector.stop("error");
                },
                files: function() {
                    let { message, name, details, stack } = this.data._error;

                    let string = [
                        "NAME :", name,
                        '',
                        "MESSAGE :", message,
                        '',
                        "DETAILS :", (JSON.stringify(details, null, 2) ?? 'No details...'),
                        '',
                        "STACK :", stack,
                        '',
                        "GAME DATA :", JSON.stringify(this.data._game, null, 2),
                        '',
                        "SELECTED OPTION :", JSON.stringify(this.data._option, null, 2),
                    ].join('\n');

                    const buffer = Buffer.from(string, 'utf-8');
                    let attachment = new AttachmentBuilder(buffer, { name: `error.txt` });
                    
                    return [ attachment ];
                },
                embeds: function() {
                    let { message, name, details, stack } = this.data._error;
                    const limit = (str) => str ? str.length > 1015 ? str.slice(0,1015) + '…' : str : str;

                    return [{
                        title: "FATAL ERROR",
                        description: `Une erreur fatale est survenue :(`,
                        fields: [
                            {
                                name: 'Error :',
                                value: "```\n"+ limit(name) +"\n```",
                            },
                            {
                                name: 'Message :',
                                value: "```\n"+ limit(message) +"\n```",
                            },
                            {
                                name: 'Details :',
                                value: "```js\n"+ limit(JSON.stringify(details, null, 2)) +"\n```"
                            },
                            {
                                name: 'Stack :',
                                value: "```js\n"+ limit(stack) +"\n```"
                            },
                        ],
                        color: 0xB7091C,
                    }];
                },
                components: []
            }
        ]
    });
    

    // loadingEmoteMessage.delete().catch(noop);
    try {
        await VentureMenu.send();
        await VentureMenu.handle();
    } catch (err) {
        let errorstring = [
            err.name,
            err.message,
            (JSON.stringify(err.details, null, 2) ?? 'No details.'),
            err.stack,
        ].join('\n');

        const buffer = Buffer.from(errorstring, 'utf-8');
        let attachment = new AttachmentBuilder(buffer, { name: `error.txt` });

        discordElement.channel.send({
            content: `>>> # ${err.name}\n## ${err.message}`,
            files: [ attachment ]
        });
    }
}