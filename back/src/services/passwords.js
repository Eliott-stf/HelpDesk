const bcrypt = require('bcryptjs');

const COST = 10;

const hashPassword = (plain) => bcrypt.hash(plain, COST);
const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);


const DUMMY_HASH = bcrypt.hashSync('mot-de-passe-factice', COST);

module.exports = { hashPassword, verifyPassword, DUMMY_HASH };
