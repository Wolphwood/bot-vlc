const Emotes = require("../assets/Emotes");
const { Cooldown } = require("./Cooldown");
const { noop } = require("./functions/Utils");

global.loadedModules.modules.push({
    name: "AutoReponse",
    version: "1.0",
});

module.exports = ({ message }) => {
    if (message.author.bot) return;

    let cooldown = new Cooldown({ name: 'tomato', id: '*' });

    if (!cooldown.passed()) return;

    let content = message.content.simplify();

    // if (message.author.id === '282268758741876736' && /tomato|tomate|🍅/gi.test(content)) {
    if (/tomato|tomate|🍅/gi.test(content)) {
        if (Math.random() < 0.2) return;

        if (Math.random() > 0.9) {
            for (let emote of Emotes.tomato.values().shuffle()) {
                message.react(emote).catch(noop);
            }
        } else {
            message.react(Emotes.tomato.values().getRandomElement())
        }

        cooldown.set(60 * 2 * 1000)
    }

}