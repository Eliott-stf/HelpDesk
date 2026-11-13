const { z } = require('zod');
const { LIMITS } = require('../constants');

const email = z
  .string({ error: 'E-mail requis' })
  .trim()
  .toLowerCase()
  .max(LIMITS.email.max)
  .pipe(z.email({ error: 'Adresse e-mail invalide' }));

// RG1 : un champ `role` envoyé par le client est ignoré (supprimé par zod), le rôle est toujours `user`.
const registerSchema = z.object({
  email,
  name: z.string({ error: 'Nom requis' }).trim().min(LIMITS.name.min).max(LIMITS.name.max),
  password: z
    .string({ error: 'Mot de passe requis' })
    .min(LIMITS.password.min, `${LIMITS.password.min} caractères minimum`)
    .max(LIMITS.password.max, `${LIMITS.password.max} caractères maximum`),
});

const loginSchema = z.object({
  email,
  password: z.string({ error: 'Mot de passe requis' }).min(1).max(LIMITS.password.max),
});

module.exports = { registerSchema, loginSchema };
