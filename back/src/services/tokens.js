const jwt = require('jsonwebtoken');

// Deux jetons, deux secrets : un jeton de rafraîchissement ne peut jamais servir de jeton d'accès.
// Le jeton d'accès voyage dans le header Authorization, le jeton de rafraîchissement dans un cookie httpOnly.
const ALGORITHM = 'HS256';

function sign(user, secret, ttlSeconds) {
  return jwt.sign({ role: user.role }, secret, {
    algorithm: ALGORITHM,
    subject: user.id,
    expiresIn: ttlSeconds,
  });
}

function verify(token, secret) {
  return jwt.verify(token, secret, { algorithms: [ALGORITHM] });
}

const signAccessToken = (user, config) => sign(user, config.jwt.accessSecret, config.jwt.accessTtlSeconds);
const signRefreshToken = (user, config) => sign(user, config.jwt.refreshSecret, config.jwt.refreshTtlSeconds);
const verifyAccessToken = (token, config) => verify(token, config.jwt.accessSecret);
const verifyRefreshToken = (token, config) => verify(token, config.jwt.refreshSecret);

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken };
