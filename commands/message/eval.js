import { EmbedBuilder, AttachmentBuilder, ComponentType, ButtonStyle, MessageFlags } from 'discord.js';
import util from 'node:util';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { PERMISSION } from '#constants';
import { dbManager } from '#modules/database/Manager';

const require = createRequire(import.meta.url);

export default {
  name: "eval",
  category: 'root',
  aliases: ['e'],
  userPermission: PERMISSION.ROOT, 

  run: async ({ client, message, args, raw, manager }) => {
    message.delete();

    const code = raw.replace(/^```(js|javascript)?\n|```$/g, '').trim();
    
    const logs = [];
    const pushLog = (prefix, args) => {
      const content = args.map(a => (typeof a === 'string' ? a : (a.toString ? a.toString() : a))).join(' ');
      logs.push(prefix ? `[${prefix}] ${content}` : content);
    };

    // Configuration du Logger complet
    const logger = {
      log: (...a) => pushLog('', a),
      info: (...a) => pushLog('[INFO]', a),
      warn: (...a) => pushLog('[WARN]', a),
      error: (...a) => pushLog('[ERROR]', a),
      debug: (...a) => pushLog('[DEBUG]', a),
      fatal: (...a) => pushLog('[FATAL]', a),
      inspect: (...a) => {
        a.forEach(arg => logs.push(util.inspect(arg, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null, colors: false })));
      },
      blank: (n = 1) => logs.push('\n'.repeat(Math.max(0, n - 1)))
    };

    const context = vm.createContext({
      client,
      message,
      manager,
      require,
      fetch,
      util,
      console: logger,
      log: logger,    
      process,
      global
    });

    const script = new vm.Script(`(async () => {\n${code}\n})()`);

    const codeblock = (str) => `\`\`\`js\n${str.limit(1000)}\n\`\`\``

    try {
      const startTime = performance.now();
      const result = await script.runInContext(context, { timeout: 10000 });
      const duration = (performance.now() - startTime).toFixed(2);

      const inspectResult = util.inspect(result, { depth: null, maxArrayLength: null, maxStringLength: null, colors: false });

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('🛠️ Root Eval')
        .setDescription(`**Duration:** \`${duration}ms\``)
        .addFields([{ name: "Code", value: codeblock(code) }])
        .setTimestamp();

      const buttons = [];
      
      if (code.length > 1000) {
        const logcontext = dbManager.log.getContextFromElement("EVAL", message, code);
        const uid = await dbManager.log.save(logcontext);
        
        buttons.push({
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          label: "Get full code",
          custom_id: `GETLOG:ROOT:${uid}`
        });
      }

      // Traitement de tous les logs capturés
      if (logs.length > 0) {
        const fullLogs = logs.join('\n');
        
        console.inspect(logs);

        if (fullLogs.length > 1000) {
          const logcontext = dbManager.log.getContextFromElement("EVAL", message, fullLogs);
          const uid = await dbManager.log.save(logcontext);

          buttons.push({
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "Get full logs",
            custom_id: `GETLOG:ROOT:${uid}`
          });
        }
        
        embed.addFields([{ name: 'Logs', value: codeblock(fullLogs) }]);
      }
      
      // Traitement de l'output (le return)
      if (inspectResult !== 'undefined') {
        if (inspectResult.length > 1000) {
          const logcontext = dbManager.log.getContextFromElement("EVAL", message, inspectResult);
          const uid = await dbManager.log.save(logcontext);
          
          buttons.push({
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "Get full result",
            custom_id: `GETLOG:ROOT:${uid}`
          });
        }
        embed.addFields([{ name: 'Output', value: codeblock(inspectResult) }]);
      }

      await message.channel.send({
        embeds: [embed],
        components: buttons.chunkOf(5).slice(0,5).map(components => ({ type: ComponentType.ActionRow, components })),
      });
    } catch (err) {
      const errorStack = util.inspect(err, { depth: null, colors: false });
      
      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🛠️ Root Eval')
        .setDescription(`**ERROR DETECTED**`)
        .setTimestamp()
      ;
      
      const buttons = [];

      if (code.length > 1000) {
        const logcontext = dbManager.log.getContextFromElement("EVAL", message, code);
        const uid = await dbManager.log.save(logcontext);
        
        buttons.push({
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          label: "Get full code",
          custom_id: `GETLOG:ROOT:${uid}`
        });
      }
      embed.addFields([{ name: "Code", value: codeblock(code) }]);

      if (logs.length > 0) {
        const fullLogs = logs.join('\n');
        if (fullLogs.length > 1000) {
          const logcontext = dbManager.log.getContextFromElement("EVAL", message, logs);
          const uid = await dbManager.log.save(logcontext);
          
          buttons.push({
            type: ComponentType.Button,
            style: ButtonStyle.Secondary,
            label: "Get full logs",
            custom_id: `GETLOG:ROOT:${uid}`
          });
        }
        embed.addFields([{ name: 'Logs', value: codeblock(fullLogs) }]);
      }
      
      if (errorStack.length > 1000) {
        const logcontext = dbManager.log.getContextFromElement("EVAL", message, errorStack);
        const uid = await dbManager.log.save(logcontext);
        
        buttons.push({
          type: ComponentType.Button,
          style: ButtonStyle.Secondary,
          label: "Get full error",
          custom_id: `GETLOG:ROOT:${uid}`
        });
      }
      embed.addFields([{ name: "Error", value: codeblock(errorStack ?? 'Unknown') }]);

      await message.channel.send({
        embeds: [ embed ],
        components: buttons.chunkOf(5).slice(0,5).map(components => ({ type: ComponentType.ActionRow, components })),
      });
    }
  }
};