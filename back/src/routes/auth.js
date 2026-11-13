const express = require('express');
const { ROLES } = require('../constants');
const { conflict, unauthorized } = require('../errors');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { registerSchema, loginSchema } = require('../validation/auth');
const { hashPassword, verifyPassword, DUMMY_HASH } = require('../services/passwords');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../services/tokens');
const { createUser, findUserByEmail, findUserById, publicUser } = require('../services/users');

const REFRESH_COOKIE = 'refresh_token';

function buildAuthRouter({ db, config }) {
  const router = express.Router();

  // Le cookie n'est envoyé que vers /auth, en SameSite=Strict, et illisible depuis le JavaScript du front
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.cookieSecure,
    path: '/auth',
  };

  function startSession(res, userDoc) {
    const user = publicUser(userDoc);
    res.cookie(REFRESH_COOKIE, signRefreshToken(user, config), {
      ...cookieOptions,
      maxAge: config.jwt.refreshTtlSeconds * 1000,
    });
    return { user, accessToken: signAccessToken(user, config) };
  }

  // RG1 : l'inscription crée toujours un `user`. RG3 : e-mail unique.
  router.post('/register', validate(registerSchema), async (req, res) => {
    const { email, name, password } = req.body;
    let userDoc;
    try {
      userDoc = await createUser(db, {
        email,
        name,
        passwordHash: await hashPassword(password),
        role: ROLES.USER,
      });
    } catch (err) {
      if (err.code === 11000) throw conflict('Cette adresse e-mail est déjà utilisée');
      throw err;
    }
    res.status(201).json(startSession(res, userDoc));
  });

  router.post('/login', validate(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await findUserByEmail(db, email);
    // Même message et même temps de calcul que l'e-mail existe ou non.
    const ok = await verifyPassword(password, userDoc ? userDoc.passwordHash : DUMMY_HASH);
    if (!userDoc || !ok) throw unauthorized('E-mail ou mot de passe incorrect');
    res.json(startSession(res, userDoc));
  });

  // Échange le cookie de rafraîchissement contre un nouveau jeton d'accès.
  router.post('/refresh', async (req, res) => {
    const token = req.cookies && req.cookies[REFRESH_COOKIE];
    if (!token) throw unauthorized('Session absente');
    let payload;
    try {
      payload = verifyRefreshToken(token, config);
    } catch {
      throw unauthorized('Session expirée');
    }
    const userDoc = await findUserById(db, payload.sub);
    if (!userDoc) throw unauthorized('Utilisateur introuvable');
    const user = publicUser(userDoc);
    res.json({ user, accessToken: signAccessToken(user, config) });
  });

  router.post('/logout', (_req, res) => {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', authenticate({ db, config }), (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

module.exports = { buildAuthRouter };
