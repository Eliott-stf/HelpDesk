// Erreur applicative : porte un code HTTP et un code machine stable pour le front.
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const badRequest = (message = 'Requête invalide', details) =>
  new AppError(400, 'BAD_REQUEST', message, details);
const unauthorized = (message = 'Authentification requise') => new AppError(401, 'UNAUTHORIZED', message);
const forbidden = (message = 'Action non autorisée') => new AppError(403, 'FORBIDDEN', message);
const notFound = (message = 'Ressource introuvable') => new AppError(404, 'NOT_FOUND', message);
const conflict = (message = 'Conflit avec l\'état actuel de la ressource') =>
  new AppError(409, 'CONFLICT', message);

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict };
