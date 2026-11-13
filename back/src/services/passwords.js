const bcrypt = require('bcryptjs');

const COST = 10;

const hashPassword = (plain) => bcrypt.hash(plain, COST);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Hash factice : permet de faire le même travail quand l'e-mail n'existe pas,
// pour ne pas révéler par le temps de réponse si un compte existe.
const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', COST);

module.exports = { hashPassword, verifyPassword, DUMMY_HASH };
