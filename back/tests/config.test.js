const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { loadConfig } = require('../src/config');

describe('configuration', () => {
  it('utilise des valeurs par défaut hors production', () => {
    const c = loadConfig({});
    assert.equal(c.port, 3000);
    assert.ok(c.jwt.accessSecret.length >= 32);
    assert.notEqual(c.jwt.accessSecret, c.jwt.refreshSecret);
  });

  it('traite une ligne vide du .env comme non définie', () => {
    const c = loadConfig({ JWT_ACCESS_SECRET: '', JWT_REFRESH_SECRET: '' });
    assert.ok(c.jwt.accessSecret.length >= 32);
  });

  it('refuse un secret trop court', () => {
    assert.throws(() => loadConfig({ JWT_ACCESS_SECRET: 'court' }), /Configuration invalide/);
  });

  it('exige les secrets en production', () => {
    assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /obligatoires en production/);
  });

  it('accepte la production avec des secrets valides', () => {
    const secret = 'x'.repeat(32);
    const c = loadConfig({ NODE_ENV: 'production', JWT_ACCESS_SECRET: secret, JWT_REFRESH_SECRET: secret + 'y' });
    assert.equal(c.jwt.accessSecret, secret);
  });
});
