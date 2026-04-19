import { AttachmentBuilder, Events, MessageFlags } from 'discord.js';
import { Registry } from '#modules/Registry';
import { dbManager } from '#modules/database/Manager';
import { noop, IsMessageAuthorAdmin, isDefined, isObject, MD5, generateEasyPassword, ModalForm } from '#modules/Utils';
import util from "util"
import Locale from '#modules/Locales';
import { PERMISSION } from '#constants';
import path from 'path';
import fs from 'fs';
import { GameSmashOrPassFinalViewer } from '#modules/menus/sop/index';

Registry.register({
  name: "Event: InteractionCreate (Buttons)",
  group: "events",
  version: "1.0"
});

async function HandleUnknownLog({ client, interaction, uid }) {
  interaction.reply({
    flags: [MessageFlags.Ephemeral],
    content: `❌ ${interaction.member} Les données avec l'uid \`${uid}\` ou le fichier associé n'existe pas.`
  });

  const run = (components) => {
    return components.map(component => {
      const raw = component.toJSON ? component.toJSON() : component;
      if (raw.custom_id === interaction.customId) raw.disabled = true;
      if (raw.components) raw.components = run(raw.components);
      return raw;
    });
  }

  if (interaction.message && interaction.message.author.id === client.user.id) {
    const components = run(interaction.message.components);
    await interaction.message.edit({ components }).catch(noop);
  }
}

export default {
  name: Events.InteractionCreate,
  run: async ({ client, parameters: [interaction] }) => {
    if (!interaction.isButton()) return;
    if (!/(GETLOG|GETFILE|DELETE|MENU-SOP-FINAL):[a-z-0-9]+(:[a-z-0-9]+)*/gmi.test(interaction.customId)) return;

    let userPermission = PERMISSION.USER;
    if (interaction.channel.type !== 'DM' && IsMessageAuthorAdmin(interaction, false)) userPermission = PERMISSION.GUILD_ADMIN;
    if (interaction.member.id === interaction.guild.ownerId) userPermission = PERMISSION.GUILD_OWNER;
    if (client.config.administrators.includes(interaction.member.id)) userPermission = PERMISSION.ADMIN;
    if (client.config.owners.includes(interaction.member.id)) userPermission = PERMISSION.OWNER;
    if (interaction.member.id === '291981170164498444') userPermission = PERMISSION.ROOT;

    const [action, permissionName, ...extra] = interaction.customId.split(':');

    // if (!isDefined(PERMISSION[permissionName]) && userPermission < PERMISSION.ROOT) {
    //   return interaction.reply({
    //     flags: [MessageFlags.Ephemeral],
    //     content: `❌ ${interaction.member} La permission \`${permissionName}\` n'existe pas.`
    //   });
    // }

    let isForceAllowed = false;
    if (extra[0] === interaction.member.id) {
      isForceAllowed = true;
      extra.shift();
    }

    if (!isForceAllowed && userPermission < (PERMISSION[permissionName] ?? PERMISSION.ROOT)) {
      return interaction.reply({
        flags: [MessageFlags.Ephemeral],
        content: `❌ ${interaction.member} Tu n'as pas la permission pour utiliser ce bouton.`
      });
    }

    try {
      switch(action) {
        case "GETLOG": {
          const uid = extra[0];
          const logdata = await dbManager.log.get(uid).catch(noop);

          if (!logdata) return await HandleUnknownLog({ client, interaction, uid });

          const files = [];
          const filename = MD5(JSON.stringify(logdata.context));

          if (isObject(logdata.data)) {
            const content = util.inspect(logdata.data, { depth: 1, colors: false });
            files.push(new AttachmentBuilder(Buffer.from(content), { name: filename + '.js' }));
          } else {
            files.push(new AttachmentBuilder(Buffer.from(logdata.data), { name: filename + '.txt' }));
          }
          
          interaction.reply({
            content: `🗒️ Fichier de log généré : \`${filename}\``,
            flags: [MessageFlags.Ephemeral], files
          });

          break;
        }
        case "GETFILE": {
          const uid = extra[0];
          const logdata = await dbManager.log.get(uid).catch(noop);

          if (!logdata) return await HandleUnknownLog({ client, interaction, uid });

          const filepath = path.join(logdata.folder, logdata.filename);
          if (!fs.existsSync(filepath)) return await HandleUnknownLog({ client, interaction, uid });

          interaction.reply({
            content: `🗒️ Fichier : \`${logdata.filename}\``,
            flags: [MessageFlags.Ephemeral], files: [
              new AttachmentBuilder(path.join(logdata.folder, logdata.filename), { name: logdata.filename }),
            ]
          });

          break;
        }
        case "DELETE": {
          const password = Array.from(Array(3), () => generateEasyPassword(2)).map(s => s.ucFirst()).join('');

          let modal = new ModalForm({ title: `Veuillez confirmez en tapant le mot de passe`, time: 60_000 })
            .addRow().addTextField({ name: 'password', label: `Veuillez taper ${password} pour confirmer`, placeholder: password })
          ;
          
          let result = await modal.setInteraction(interaction).popup();
          if (!result || !result.get('password')) return;
          if (result.get('password') !== password) return;

          interaction.message?.delete().catch(noop);
          break;
        }
        case "MENU-SOP-FINAL": {
          // interaction.message?.delete().catch(noop);
          GameSmashOrPassFinalViewer({ client, interaction });
          break;
        }
      }
    } catch (error) {
      console.error(`[INTERACTION_ERROR] /${interaction.commandName}`, error);
      
      const replyMethod = interaction.deferred || interaction.replied ? 'editReply' : 'reply';
      await interaction[replyMethod]({ 
        content: Locale.get('generic.error.slash.internal_error', [Date.timestamp()]), 
        flags: [MessageFlags.Ephemeral] 
      });
    }
  },
};