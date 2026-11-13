const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { buildRouter } = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Fabrique l'application sans l'écouter sur un port : utilisable par server.js et par les tests.
function createApp({ db, config }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use(buildRouter({ db, config }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
