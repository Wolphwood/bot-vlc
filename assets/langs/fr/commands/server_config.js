export default {
  "commandinfo.config.description": "Configuration du serveur",
  "commandinfo.config.syntax": "%f",


  "command.config.error.open": "Attention d'autre personnes ont déjà ouvert ce menu.\n%0a est/sont actuellement en train de l'utiliser.",
  
  "command.config.embed.field.name.commands": "Configuration des Commandes",
  "command.config.embed.field.value.commands": "Configure le cooldown et les accès aux salons.",
  "command.config.embed.field.name.server": "Configuration du Serveur",
  "command.config.embed.field.value.server": "Configure les valeurs de la commande `daily` et la langue du bot sur le serveur.",
  "command.config.embed.field.name.rank": "Configuration du Classement",
  "command.config.embed.field.value.rank": "Configure les rôles données au top 3 des joueurs du classement.",

  "command.config.commands.embed.title": "Configuration des commandes",
  "command.config.commands.embed.description": "Selectionne la commande à configurer",
  "command.config.commands.embed.field.name": "Liste des commandes sur cette page :",
  "command.config.commands.embed.chat.field.name": "%1a Commande(s) textuelle : **%0a**",
  "command.config.commands.embed.slash.field.name": "%1a Commande(s) slash : **%0a**",
  "command.config.commands.embed.hybrid.field.name": "%1a Commande(s) hybride : **%0a**",

  "command.config.commands.button.select": "Selectionnez une commande.",
  "command.config.commands.button.find": "Trouver une commande.",

  "command.config.command.embed.title": "Configuration de la commande %0a",
  "command.config.command.embed.field.cooldown.name": "Cooldown",
  "command.config.command.embed.field.cooldown.value": "%0a seconde(s)",
  "command.config.command.embed.field.channel.blacklist.name": "Salon(s) dans la Blacklist :",
  "command.config.command.embed.field.channel.blacklist.default.value": "Aucun salon dans la blacklist",
  "command.config.command.embed.field.channel.whitelist.name": "Salon(s) dans la Whitelist :",
  "command.config.command.embed.field.channel.whitelist.default.value": "Aucun salon dans la blacklist",

  "command.config.rank.embed.title":"Gestion des rôles de rank & des utilisateurs",
  "command.config.rank.embed.field.rank.title": "Rôles de classement",
  "command.config.rank.embed.field.users.title": "Utilisateurs",
  "command.config.rank.embed.field.users.value": "%0a utilisateurs participent au classement\n%1a utilisateurs ne peuvent pas participer au classement.",
  "command.config.rank.embed.field.roles.title": "Rôles",
  "command.config.rank.button.mark_rankable": "Marquer des membres comme classable",
  "command.config.rank.button.mark_unrankable": "Marquer des membres comme non classable",

  "command.config.guild.daily.modal.text.label": "Saisissez la nouvelle valeur",
  "command.config.guild.daily.modal.text.placeholder": "Entrez un chiffre valide",
  
  "command.config.button.commands": "Commandes",
  "command.config.button.server": "Serveur",
  "command.config.button.rank": "Ranks",
  "command.config.button.close": "Fermer",
  "command.config.button.home": "Acceuil",
  "command.config.button.back": "Retour",
  
  "command.config.command.button.cooldown":"Modifier le cooldown",
  "command.config.command.button.channel.add.whitelist":"Ajouter un salon à la whitelist",
  "command.config.command.button.channel.add.blacklist":"Ajouter un salon à la blacklist",
  "command.config.command.button.channel.remove.whitelist":"Retirer un salon à la whitelist",
  "command.config.command.button.channel.remove.blacklist":"Retirer un salon à la blacklist",
  "command.config.command.button.channel.clear":"Effacer touts les salons",
  "command.config.command.button.channel.whitelist":"Mode whitelist",
  "command.config.command.button.channel.blacklist":"Mode blacklist",
  "command.config.command.select.placeholder":"Selectionnez la commande à modifier.",

  "command.config.button.guilds.":"Mode blacklist",
  
  "command.config.guild.button.daily": "Daily",
  "command.config.guild.button.point": "Point",
  "command.config.guild.button.lang": "Langue",
  "command.config.guild.button.staff": "Staff",

  "command.config.guild.embed.title": "Configuration actuelle du serveur",
  "command.config.guild.embed.field.daily.name": "Points journalier :",
  "command.config.guild.embed.field.daily.value": "Valeur aléatoire : `%0a ~ %1a`\nMultiplicateur bonus pour les boosters : `%2a`",
  "command.config.guild.embed.field.point.name": "Valeur d'expérience :",
  "command.config.guild.embed.field.point.value": "Valeur aléatoire : `%0a ~ %1a`\nMultiplicateur bonus pour les boosters : `%2a`",
  "command.config.guild.embed.field.lang.name": "Langue :",
  "command.config.guild.embed.field.lang.value": "Langue par défaut du serveur : `%0a`",
  
  "command.config.guild.daily.embed.title": "Configuration du bonus journalier",
  "command.config.guild.daily.embed.description": "Est une commande journalière permettant de gagner des points.\nLa valeur est aléatoire dans les limites définis, de plus un multiplicateur bonus peux être appliqué aux personnes qui boost le serveur.",
  "command.config.guild.daily.embed.field.name": "Configuration actuelle :",
  "command.config.guild.daily.embed.field.value": "```\nValeur minimale : %0a\nValeure maximale : %1a\nMultiplicateur de boost : %3a\n```",

  "command.config.guild.point.embed.title": "Configuration du gain de points",
  "command.config.guild.point.embed.description": "Système de récompense de membres par le gain d'une valeur aléatoire de point lors d'activité écrite.",
  "command.config.guild.point.embed.field.name": "Configuration actuelle :",
  "command.config.guild.point.embed.field.value": "```\nValeur minimale : %0a\nValeure maximale : %1a\nMultiplicateur de boost : %2a\n```",

  "command.config.guild.lang.embed.title": "Configuration de la langue du serveur",
  "command.config.guild.lang.embed.description": "Définis la langue par défaut d'un utilisateur arrivant sur le serveur.",
  "command.config.guild.lang.embed.field.name": "Configuration actuelle :",
  "command.config.guild.lang.embed.field.value": "```\n%0a\n```",
  "command.config.guild.lang.select.placeholder": "Selectionnez une langue.",

  "command.config.guild.staff.embed.title": "Configuration des permissions du staff",
  "command.config.guild.staff.embed.description": "Définis les rôles et utilisateurs faisant parti du staff.",
  "command.config.guild.staff.embed.field.administrator.user.name": "Utilisateur.ice(s) Admin",
  "command.config.guild.staff.embed.field.administrator.role.name": "Rôle(s) Admin :",
  "command.config.guild.staff.embed.field.administrator.default.value": "Aucun.e Administrateur.ice",
  "command.config.guild.staff.embed.field.moderator.user.name": "Utilisateur.ice(s) Modo :",
  "command.config.guild.staff.embed.field.moderator.role.name": "Rôle(s) Modo :",
  "command.config.guild.staff.embed.field.moderator.default.value": "Aucun.e Modérateur.ice",

  "command.config.guild.staff.button.administrator": "Administrateur.ice",
  "command.config.guild.staff.button.moderator": "Modérateur.ice",


  "command.config.guild.rank.embed.title": "",
  "command.config.guild.rank.embed.description": "",
  
  "command.config.guild.rank.select.placeholder": "Selectionnez un rôle de classement pour le modifier ou le créer.",
  "command.config.guild.rank.select.option.rank1": "Rang #1",
  "command.config.guild.rank.select.option.rank2": "Rang #2",
  "command.config.guild.rank.select.option.rank3": "Rang #3",
  "command.config.guild.rank.button.role.create": "Créer un rôle",
  "command.config.guild.rank.button.role.set": "Définir un rôle",
  "command.config.guild.rank.button.role.unset": "Indéfinir le rôle",
  "command.config.guild.input.mention.rank": "_Veuillez mentionnez le rôle de rang_",
  "command.config.guild.input.mention.rankable.true": "_Veuillez mentionnez un rôle ou un utilisateur pour le debannir du classement général et indiquez la raison._",
  "command.config.guild.input.mention.rankable.false": "_Veuillez mentionnez un rôle ou un utilisateur pour le bannir du classement général et indiquez la raison._",
}