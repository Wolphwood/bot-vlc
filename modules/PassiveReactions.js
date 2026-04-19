import { Registry } from '#modules/Registry';
import { Cooldown } from '#modules/Cooldown';
import { noop } from '#modules/Utils';

Registry.register({
  name: "Passive Reactions",
  version: "1.0"
});

function BuildWordList(...words) {
    return new RegExp(`(${words.flat(Infinity).join('|').simplify()})([^\w]|$)`, 'gi')
}

const WordList = {
    bonjour: ["bonjour", "bonsoir", "salut", "coucou", "allo", "he", "hey", "hello", "hi", "yo", "wesh", "yop", "hola", "ola", "buongiorno", "salve", "adishatz", "salam", "salutations", "slt", "bjr", "👋","👋🏻","👋🏼","👋🏽","👋🏾","👋🏿"],
    slay: ["slay"],
    lol: ["lol", "mdr", "ptdr", "haha", "xD", "lul", '😂', '🤣'],
    hehe: ["héhé", 'bg', "(beau|belle) gosse"],
    sad: ["triste", "snif", "\\:\\'\\(", "pleure", '😢', '💔'],
    love: ["love", "amour", "❤️", "bisou", "keur", "coeur"],
    omg: ["wow", "incroyable", "omg", "o_O", "cho(k|qu)bar"],
    gg: ["bravo", "gg", "félicitations", "bien (joué|jouer|ouej)"],
    coffee: ["[kc]afé", "[kc]o+f+(e+|i+)", "kfé"],
}

let reactions = [
    {
        trigger: [ BuildWordList(WordList.bonjour) ],
        emote: [ '👋' ]
    },
    {
        trigger: [ BuildWordList(WordList.slay) ],
        emote: [ '💅', '✨' ]
    },
    {
        trigger: [ BuildWordList(WordList.lol) ],
        emote: [ '😂', '🤣' ]
    },
    {
        trigger: [ BuildWordList(WordList.sad) ],
        emote: [ '😢', '💔' ]
    },
    {
        trigger: [ BuildWordList(WordList.love) ],
        emote: [ '❤️', '😘', '💖' ]
    },
    {
        trigger: [ BuildWordList(WordList.hehe) ],
        emote: [ '😎' ]
    },
    {
        trigger: [ BuildWordList(WordList.omg) ],
        emote: [ '😲', '🤯' ]
    },
    {
        trigger: [ BuildWordList(WordList.gg) ],
        emote: [ '🎉', '🏆', '🙌' ]
    },
    {
        trigger: [ BuildWordList(WordList.coffee) ],
        emote: [ '☕' ]
    },
]

export default ({ message }) => {
    let global_cooldown = new Cooldown({ name: 'passive-reactions', id: '*' });
    let cooldown = new Cooldown({ name: 'passive-reactions', id: message.author.id });

    if (!global_cooldown.passed() || !cooldown.passed()) return;

    let content = message.content.simplify().toLowerCase();

    for (let reaction of reactions.shuffle()) {
        if (reaction.trigger.some(e => e.constructor == RegExp ? e.test(content) : content.includes(e))) {
            message.react( reaction.emote.getRandomElement() ).catch(noop)
            
            cooldown.set(60 * 2 * 1000);
            global_cooldown.set(30 * 1000);

            break;
        }
    }
}