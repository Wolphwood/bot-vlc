import Emotes from '#modules/Emotes';
import { Registry } from '#modules/Registry';
import { Cooldown } from '#modules/Cooldown';
import { noop } from '#modules/Utils';

Registry.register({
  name: "Tomato",
  version: "1.0"
});

const SpecificIds = {
    Manoah: '282268758741876736',
}

export default ({ message }) => {
    let cooldown = new Cooldown({ name: 'tomato', id: message.author.id });

    if (!cooldown.passed()) return;

    let content = message.content.simplify();

    if (/tomato|tomate|🍅/gi.test(content) || Math.random() < 0.15 || message.author.id === SpecificIds.Manoah) {
        let _sfC = message.author.id === SpecificIds.Manoah ? 0.995 : 0.99; // all
        let _sgC = 0.999; // golden tomato
        
        if (Math.random() > _sgC) {
            message.react(Emotes.tomato.golden_tomato).catch(noop);
        } else
        if (Math.random() > _sfC) {
            for (let emote of Emotes.tomato.values().slice(0,-1).shuffle()) {
                message.react(emote).catch(noop);
            }
        } else {
            message.react(Emotes.tomato.values().slice(0,-1).getRandomElement()).catch(noop);
        }

        cooldown.set(60 * 2 * 1000)
    }
}