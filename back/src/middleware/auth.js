const { unauthorized, forbidden } = require('../errors');
const { verifyAccessToken } = require('../services/tokens');
const { findUserById, publicUser } = require('../services/users');

// RG4 : exige un jeton d'accès valide dans `Authorization: Bearer <jeton>`.
// L'utilisateur est relu en base à chaque requête : un compte supprimé ou un rôle modifié
// est pris en compte immédiatement, sans attendre l'expiration du jeton.
function authenticate({ db, config }) {
  return async (req, _res, next) => {
    const [scheme, token] = (req.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthorized());

    let payload;
    try {
      payload = verifyAccessToken(token, config);
    } catch {
      return next(unauthorized('Jeton invalide ou expiré'));
    }

    const user = await findUserById(db, payload.sub);
    if (!user) return next(unauthorized('Utilisateur introuvable'));

    req.user = publicUser(user);
    return next();
  };
}

// À placer après `authenticate`. Exemple : requireRole(ROLES.TECHNICIAN)
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    return next();
  };
}

module.exports = { authenticate, requireRole };
