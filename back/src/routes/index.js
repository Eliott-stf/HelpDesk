const express = require('express');
const { buildAuthRouter } = require('./auth');
const { buildTicketsRouter } = require('./tickets');

// Point d'assemblage 
function buildRouter({ db, config }) {
  const router = express.Router();

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.use('/auth', buildAuthRouter({ db, config }));
  router.use('/tickets', buildTicketsRouter({ db, config }));

  return router;
}

module.exports = { buildRouter };
