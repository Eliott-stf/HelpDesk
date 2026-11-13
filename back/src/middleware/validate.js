const { badRequest } = require('../errors');

// Valide req[source] avec un schéma zod et remplace la valeur par la version nettoyée.
// Les champs inconnus sont rejetés si le schéma est .strict() (cas par défaut dans l'API).
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return next(badRequest('Données invalides', details));
    }
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
