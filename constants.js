export const PERMISSION = {
  USER: 0,
  GUILD_MOD: 1,
  GUILD_ADMIN: 2,
  GUILD_OWNER: 3,
  ADMIN: 100,
  DEV: 101,
  OWNER: 102,
  ROOT: Number.MAX_SAFE_INTEGER,
};

export const CHANNEL_CONFIG = {
  WHITELIST: 1,
  BLACKLIST: 2
};

export const COMMAND_TYPE = {
  MESSAGE: 1,
  HYBRID: 2,
  SLASH: 3,
}

export const SOP_PERMISSION = {
  // --- Lecture & Jeu ---
  READ        : 1 << 0,
  PLAY        : 1 << 1,

  // --- Gestion des Personnages ---
  ADD_CHAR    : 1 << 2,
  EDIT_CHAR   : 1 << 3,
  REM_CHAR    : 1 << 4,
  
  // --- Paramètres de Groupe ---
  MANAGE_GRP  : 1 << 5,
  MANAGE_PERMS: 1 << 6,

  // --- Administration Avancée (Critique) ---
  TRANSFER    : 1 << 7,
  RESET_STATS : 1 << 8,
}

