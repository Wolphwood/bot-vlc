import { Registry } from '#modules/Registry';
// MARK: Register Module
Registry.register({
  name: "Cooldown",
  version: "4.0",
  details: [
    'module.purge',
    'module.Cooldown',
    'Cooldown.cooldown',
    'Cooldown.exist',
    'Cooldown.prototype.passed',
    'Cooldown.prototype.remain',
    'Cooldown.prototype.set',
    'Cooldown.prototype.setTimestamp',
    'Cooldown.prototype.reset',
    'Cooldown.prototype.toJSON',
    'Cooldown.prototype.clone',
  ]
});


const _COOLDOWN = new Map();

/**
 * Nettoie les cooldowns expirés pour libérer la RAM
 */
export function purge() {
  for (const [name, users] of _COOLDOWN.entries()) {
    for (const [id, timestamp] of users.entries()) {
      if (Date.timestamp() >= timestamp) {
        users.delete(id);
      }
    }
    if (users.size === 0) {
      _COOLDOWN.delete(name);
    }
  }
}

// Nettoyage automatique toutes les 5 minutes
export const purgeInterval = setInterval(purge, 5 * 60 * 1000);

export class Cooldown {
  constructor({ name, id, value = 0, timestamp } = {}) {
    if (name === undefined) throw new Error('INVALID_COOLDOWN_NAME');
    if (id === undefined) throw new Error('INVALID_COOLDOWN_ID');

    // Initialisation de la structure si absente
    if (!_COOLDOWN.has(name)) _COOLDOWN.set(name, new Map());
    
    const category = _COOLDOWN.get(name);
    
    // Si un timestamp est fourni, on l'utilise, sinon on initialise à l'instant T
    if (!category.has(id)) {
      category.set(id, timestamp ?? Date.timestamp());
    }

    this.name = name;
    this.id = id;
    this.timestamp = category.get(id);
    this.value = value || Math.max(0, this.timestamp - Date.timestamp());
  }

  /**
   * Accès statique aux données brutes
   */
  static get cooldown() {
    return _COOLDOWN;
  }

  /**
   * Vérifie si un cooldown existe en mémoire
   */
  static exist(name, id) {
    if (!name) return false;
    if (!id) return _COOLDOWN.has(name);
    return _COOLDOWN.get(name)?.has(id) ?? false;
  }

  /**
   * Vérifie si le cooldown est terminé
   */
  passed() {
    return Date.timestamp() >= this.timestamp;
  }

  /**
   * Retourne le temps restant en secondes
   */
  remain() {
    return Math.max(0, this.timestamp - Date.timestamp());
  }

  /**
   * Définit un cooldown de X secondes à partir de maintenant
   */
  set(time = 0) {
    this.value = time;
    this.timestamp = Date.timestamp() + time;
    _COOLDOWN.get(this.name).set(this.id, this.timestamp);
  }

  /**
   * Force un timestamp précis
   */
  setTimestamp(value = Date.timestamp()) {
    const now = Date.timestamp();
    if (value > now) {
      this.timestamp = value;
      this.value = value - now;
    } else {
      this.timestamp = 0;
      this.value = 0;
    }
    _COOLDOWN.get(this.name).set(this.id, this.timestamp);
  }

  /**
   * Réinitialise le cooldown
   */
  reset() {
    this.value = 0;
    this.timestamp = 0;
    _COOLDOWN.get(this.name)?.set(this.id, 0);
  }

  toJSON() {
    return {
      name: this.name,
      id: this.id,
      value: this.value,
      timestamp: this.timestamp,
    };
  }

  clone() {
    return new Cooldown(this.toJSON());
  }
}