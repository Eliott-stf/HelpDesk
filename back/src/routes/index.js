const express = require('express');

// Point d'assemblage des routes. Les routes auth, tickets, messages et historique
// seront montées ici aux étapes suivantes du plan.
function buildRouter(/* { db, config } */) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return router;
}

module.exports = { buildRouter };
