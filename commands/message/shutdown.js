import { PERMISSION } from '#constants';
import { noop } from '#modules/Utils';
import Locales from '#modules/Locales';

export default {
  name: "shutdown",
  aliases: ['shut'],
  aliases: ['e'],
  userPermission: PERMISSION.ROOT,
  category: 'root',

  run: async ({ message }) => {
    await message.channel.send(Locales.get('command.shutdown.success'));
    await message.delete().catch(noop);
    process.exit();
  }
};