// Valeurs de référence partagées par l'API, les validateurs MongoDB et les tests.
// Voir modelisation/01-regles-gestion.md et 05-passage-mongodb.md.

const ROLES = Object.freeze({ USER: 'user', TECHNICIAN: 'technician' });

const STATUS = Object.freeze({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  CLOSED: 'CLOSED',
});

// RG7 : liste fixe de catégories
const CATEGORIES = Object.freeze(['Matériel', 'Réseau', 'Logiciel', 'Compte/Accès', 'Autre']);

const HISTORY_TYPES = Object.freeze({ STATUS: 'STATUS', CONTENT: 'CONTENT' });
const HISTORY_FIELDS = Object.freeze(['status', 'title', 'description', 'category']);

// Limites alignées sur le dictionnaire de données
const LIMITS = Object.freeze({
  email: { max: 254 },
  name: { min: 1, max: 100 },
  password: { min: 8, max: 72 }, // 72 = limite de bcrypt
  title: { min: 3, max: 150 },
  description: { min: 10, max: 5000 },
  message: { min: 1, max: 2000 },
});

module.exports = { ROLES, STATUS, CATEGORIES, HISTORY_TYPES, HISTORY_FIELDS, LIMITS };
