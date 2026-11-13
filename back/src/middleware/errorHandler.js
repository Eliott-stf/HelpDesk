const { AppError, notFound } = require('../errors');

function notFoundHandler(req, _res, next) {
  next(notFound(`Route introuvable : ${req.method} ${req.originalUrl}`));
}

// Format d'erreur unique : { error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    const body = { code: err.code, message: err.message };
    if (err.details) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }

  // JSON mal formé envoyé par le client (erreur du parseur d'Express)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'JSON invalide' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Corps trop volumineux' } });
  }

  // Violation d'index unique MongoDB (ex. e-mail déjà utilisé)
  if (err.code === 11000) {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Valeur déjà utilisée' } });
  }

  console.error(err);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' } });
}

module.exports = { errorHandler, notFoundHandler };
