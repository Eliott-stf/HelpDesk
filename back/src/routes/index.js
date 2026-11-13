const express = require('express');
const { buildAuthRouter } = require('./auth');

// Point d'assemblage des routes. Les routes tickets, messages et historique
// seront montées ici à l'étape suivante du plan.
function buildRouter({ db, config }) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/auth', buildAuthRouter({ db, config }));

  return router;
}

module.exports = { buildRouter };
