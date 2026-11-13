const { hashPassword } = require('../../src/services/passwords');
const { createUser } = require('../../src/services/users');
const { ROLES } = require('../../src/constants');

const PASSWORD = 'motdepasse123';

// Crée directement en base (comme le fera le seed) un compte technicien : l'API n'en crée jamais (RG2).
async function seedUser(db, { email, name = 'Test', role = ROLES.USER, password = PASSWORD }) {
  return createUser(db, { email, name, role, passwordHash: await hashPassword(password) });
}

// Retourne l'en-tête Authorization d'un utilisateur déjà en base.
async function loginHeader(request, app, email, password = PASSWORD) {
  const res = await request(app).post('/auth/login').send({ email, password });
  return { Authorization: `Bearer ${res.body.accessToken}`, res };
}

module.exports = { PASSWORD, seedUser, loginHeader };
