// ========================================================================== //
global.loadedModules.events.push({
    name: "Ready",
    version: "1.0"
});
// ========================================================================== //

module.exports = async ({ client }) => {
    const { prefix } = client.config

    client.user.setStatus('online');
    client.user.setActivity(prefix +'help');
    
    console.log(`Connecté en tant que ${client.user.tag}`);
    console.log("Bot en fonctionnement.\n");
    
    global.ModuleLoaderList();
    console.blank();
    
    // Kick from all vocals
    // client.guilds.cache.map(guild => guild.members.cache.filter(m => m.id === client.user.id).forEach(m => m.voice.kick()))
}