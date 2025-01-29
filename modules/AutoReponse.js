const Emotes = require("../assets/Emotes");

global.loadedModules.modules.push({
    name: "AutoReponse",
    version: "1.0",
});

module.exports = ({ message }) => {
    if (message.author.bot) return;

    const globalCooldown = new Cooldown('auto-reponse', 'global');
    const cooldown = new Cooldown('auto-reponse', message.author.id);

    if (!globalCooldown.passed() || !cooldown.passed()) return;

    let content = message.content.toLowerCase().simplify().trim().replace(/\s+/gmi,' ');

    let triggers = [
        ["ping","Pong. Tu es content l'artiste ?"],
        ["c'est qui le champion(\\s\\?)?","Bah c'est Angel qui massacre Katou et Vaati les yeux fermer au Uno \\(Cheh\\)"],
        
        [["xd+","mdr+","ptdr+","xptdr+","l(o|u)l"],["👀","🥲","🙂","Faut rire ?","haha.","haha, trop drôle...","javou c drol","Pas compris."]],
        ["quel est la reponse (a|de) la vie(\\s\\?)?","42, j'en étais sûr !"],
        ["tadam",["magik :magic_wand: :sparkles:","majik :magic_wand: :sparkles:"]],
        
        [["bon[sj]o[oi]r(\\s?!)?","salut(\\s?!)?", "cc(\\s?!)?", "coucou(\\s?!)?","hey(\\s?!)?"],"Hey !",15],
        
        [
            [
                "quel age avez[\\s-]vous\\s*\\?",
                "etes?[\\s-]vous jeune\\s*\\?",
                "etes?[\\s-]vous age\\s*\\?",
                "etes?[\\s-]vous un (enfant|adulte)\\s*\\?",
                "quand etes?[\\s-]vous (nee?s?|nez|:nose:|👃)\\s*\\?",
            ],
            ["Old...","Child...","Kid...","Adult...", ...Array.from(Array(10), () => "Aucune réponse...")],
            15
        ],
        [
            [
                "qu'est[\\s-]ce que vous voulez\\s*\\?",
                "pourquoi etes?[\\s-]vous ici\\s*\\?",
                "etes?[\\s-]vous (mechante?|gentil(le)?)\\s*\\?",
                "voulez[\\s-]vous nous faire du mal \\?",
                "voulez[\\s-]vous (qu'on|que l'on) partes?\\s*\\?",
                "nous voulez[\\s-]vous ici\\s*\\?",
                "pouvons?[\\s-]nous (vous)? aider?\\s*\\?",
                "(qlq|quelque)s? chose ne va pas\\s*\\?",
            ],
            ["Attack...","Catch...","Kill...","Death...","Die...","Hate...","Hurt...","Leave...", ...Array.from(Array(10), () => "Aucune réponse...")],
            15
        ],
        [
            [
                "ou etes?[\\s-]vous\\s*\\?",
                "etes?[\\s-]vous proche\\s*\\?",
                "pouvez[\\s-]vous vous montrer?\\s*\\?",
                "pouvez[\\s-]vous parler?\\s*\\?",
                "etes?[\\s-]vous la\\s*\\?",
                "(qlq|quelqu)'un est la\\s*\\?",
                "(qlq|quelqu)'un est[\\s-]il dans la piece\\s*\\?",
                "y[\\s-]a[\\s-]t[\\s-]il un (esprit|fantome) ici\\s*\\?",
                "donnez?[\\s-]nous un signe\\s*\\?",
                "faites? nous un signe\\s*\\?",
                "parlez[\\s-]nous\\s*\\?",
            ],
            ["Behind...", "Close...", "Here...", "Away...", "Far...", "Next...", ...Array.from(Array(10), () => "Aucune réponse...")],
            15
        ],
        
        [["vaati","<@230635066940850176>"],"Il est dans les ombres.."],
        ["mattias","Sans le S !"],
        ["mattia","Toi je t'aime bien 😌"],
        ["blizz","On ne parle pas du Blizzard ou de Blizzard mais de Blizz, il a le sang froid."],
        ["asu","Elle est superbe, je serais même meilleurs si c'était elle qui s'occupait de moi et pas Vaati "+ Emotes.Awesome_Troll_Face],
        ["katou","Avec Tati Katou on est bien."],
        ["angel","Avec Tati Katou il est bien."],
        ["sasha","Hey ! On est d'accord que Asu et Vaati trolls."],
        ["babu","*plouf*"],
        ["dubu","On dit *Dupuduku*"],
        ["((yu)+$|yu[^a-z]|yuna)","Je vais me faire spam, oskur."],
        
        ["tupuduku","Encore Dubu dans le coin ça."],
        
        ["mc dduk","MC DDAK"],
        ["mc ddak","MC DDUK"],

        ["modos?","Si c'est urgent faut les pings !"],
        ["admins?","Mais ils sont où encore ceux là ?"],
        ["staff","Tu parles des absents c'est ça ?"],
        
        ["(m')?ennuie","Je veux bien essayer de t'amuser mais pas sur que je puisse y faire grand chose !"],
        [["jtm","je t'aime"],"Moi aussi j'aimerais bien aimer."],
        
        [["vaatibot(\\s\\?)?", "french lgbot\\+(\\s\\?)?"],"Au rapport !"],
        
        [["help","welp"],"Hésite pas à demander au staff !"],
        ["voc(\\s\\?)?","Je suis pas dispo encore mais, peut être d'autres personnes oui."],
        [["bot","conserve","robot"],["Bip Boup !", "Oui ? 🤖"]],
        
        ["let's go(\\s\\!)?","Okay let's go !"],
        ["manday","Petite poutine du canada, un régal !"],
        
        ["bi[sz]ous?(\\s\\?*)?","Papouilles !"],
        
        ["qui\\s(ma|m'a|a)\\sping(\\s\\?*)?","Pas moi !"],
        
        ["ca va(\\s\\?)?","Toujours à l'affût !"],
        ["un bot qui parle(\\s\\?)?","OwO"],
        ["oskur","A la rescousse !"],
        ["tu habites? ou(\\s\\?)?","Disons que je suis dans un environnement rempli de loupiotes, ça souffle beaucoup et j'ai l'impression de ne pas être seul."],
        
        ["hesitez pas a me dire si il y a des fautes(\\s\\!)?","Car tu sais pas écrire, on le sait."],
        ["(bn|bonne\\snuit)(\\s[\\!\\.])?",""],
        ["cheh","Pas sympas."],
        ["quoi(\\s\\?)?","Feur"],
        ["tkt","T'inquiète (Je traduis pour les autres tkt)"],
        [[":c",":\\(","😦",":frowning:"],"Ne soit pas triste ! *hug*"],
        ["ban","Où est mon marteau ? J'en ai pas ! Pinguez moi les responsables !"],

        ["59([€$£e]|\\s*euros*)","https://media.tenor.com/KNGw9DPoRNgAAAAC/orelsan-ah-c-est-marrant.gif"],

        ["wolph(wood|ie)?","Hey je le connais lui! C'est un gars cool "+ Emotes.WolphieDaWei],
        
        // ["",""],
    ];

    // Cas normaux
    let found = triggers.find(trigger => [].concat(trigger[0]).some(reg => RegExp("^"+reg,'gmi').test(content)));
    if (found) {
        globalCooldown.set(5);
        cooldown.set(15 + (found[2]||0));
        
        return message.reply({ content: [].concat(found[1]).getRandomElement() });
    }

    // Cas spéciaux
    if(RegExp("maj(\\s\\!)?",'gmi').test(content) && message.author.id === "230635066940850176") return message.reply("Merci, mise à jour appliqué !");

    // Code secret de la mort qui tue
    if (content === "6a20d919ef6203f8c0cc75d194674605a4b768f0") {
        let list = triggers.map(arr => ["Trigger(s) :",...[].concat(arr[0]).map(o => '> '+o),'Réponse(s) :',...[].concat([].concat(arr[1]).unique()).map(o => '> '+o),'_ _'].join('\n'));
        list.forEach(content => message.channel.send({ content }))
    }
}