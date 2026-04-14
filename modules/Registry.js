// Registry.js - Le gardien de tes modules
const modules = new Map();

export const Registry = {
  register: (config) => {
    modules.set(config.name, {
      ...config,
      loadedAt: new Date()
    });
  },
  
  getModule: (name) => modules.get(name),
  
  getKeys: () => Array.from(modules.keys()),
  getEntries: () => Array.from(modules.entries()),
  getValues: () => Array.from(modules.values()),
  
  count: () => modules.size
};