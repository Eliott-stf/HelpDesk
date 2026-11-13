const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { errorHandler } = require('../src/middleware/errorHandler');
const { authenticate, requireRole } = require('../src/middleware/auth');
const { signAccessToken, signRefreshToken } = require('../src/services/tokens');
const { ROLES } = require('../src/constants');
const { startTestDb } = require('./helpers/testDb');
const { PASSWORD, seedUser } = require('./helpers/auth');

let testDb;
let app;
const config = loadConfig({});

before(async () => {
  testDb = await startTestDb();
  app = createApp({ db: testDb.db, config });
});

after(async () => {
  if (testDb) await testDb.stop();
});

const register = (body) => request(app).post('/auth/register').send(body);
const validBody = (over = {}) => ({ email: 'ana@campus.fr', name: 'Ana', password: PASSWORD, ...over });
const refreshCookie = (res) => (res.headers['set-cookie'] || []).find((c) => c.startsWith('refresh_token='));

describe('POST /auth/register', () => {
  it('crée un compte user et renvoie un jeton d\'accès, sans mot de passe', async () => {
    const res = await register(validBody());
    assert.equal(res.status, 201);
    assert.equal(res.body.user.email, 'ana@campus.fr');
    assert.equal(res.body.user.role, ROLES.USER);
    assert.ok(res.body.accessToken);
    assert.equal(res.body.user.passwordHash, undefined);
    assert.equal(res.body.user.password, undefined);
  });

  it('stocke un hash bcrypt et non le mot de passe', async () => {
    const doc = await testDb.db.collection('users').findOne({ email: 'ana@campus.fr' });
    assert.notEqual(doc.passwordHash, PASSWORD);
    assert.match(doc.passwordHash, /^\$2[aby]\$/);
  });

  it('RG1 : refuse un champ `role` dans le corps', async () => {
    const res = await register(validBody({ email: 'evil@campus.fr', role: 'technician' }));
    assert.equal(res.status, 201);
    assert.equal(res.body.user.role, ROLES.USER);
    const doc = await testDb.db.collection('users').findOne({ email: 'evil@campus.fr' });
    assert.equal(doc.role, ROLES.USER);
  });

  it('RG3 : refuse un e-mail déjà utilisé (409), même avec une autre casse', async () => {
    const res = await register(validBody({ email: 'ANA@campus.fr' }));
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'CONFLICT');
  });

  it('refuse un e-mail invalide, un mot de passe trop court et un nom vide', async () => {
    for (const bad of [{ email: 'pas-un-email' }, { password: 'court' }, { name: '   ' }]) {
      const res = await register(validBody({ email: 'x@campus.fr', ...bad }));
      assert.equal(res.status, 400, JSON.stringify(bad));
    }
  });

  it('définit le cookie de rafraîchissement httpOnly, SameSite=Strict, limité à /auth', async () => {
    const res = await register(validBody({ email: 'cookie@campus.fr' }));
    const cookie = refreshCookie(res);
    assert.ok(cookie);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Strict/i);
    assert.match(cookie, /Path=\/auth/i);
  });
});

describe('POST /auth/login', () => {
  it('connecte avec le bon mot de passe', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'ana@campus.fr', password: PASSWORD });
    assert.equal(res.status, 200);
    assert.ok(res.body.accessToken);
    assert.ok(refreshCookie(res));
  });

  it('renvoie le même message pour un mauvais mot de passe et un e-mail inconnu', async () => {
    const wrongPassword = await request(app).post('/auth/login').send({ email: 'ana@campus.fr', password: 'faux-mot-de-passe' });
    const unknownEmail = await request(app).post('/auth/login').send({ email: 'inconnu@campus.fr', password: PASSWORD });
    assert.equal(wrongPassword.status, 401);
    assert.equal(unknownEmail.status, 401);
    assert.deepEqual(wrongPassword.body, unknownEmail.body);
  });

  it('connecte un technicien créé par le seed', async () => {
    await seedUser(testDb.db, { email: 'tech@campus.fr', role: ROLES.TECHNICIAN });
    const res = await request(app).post('/auth/login').send({ email: 'tech@campus.fr', password: PASSWORD });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.role, ROLES.TECHNICIAN);
  });
});

describe('GET /auth/me (RG4)', () => {
  it('refuse sans jeton (401)', async () => {
    const res = await request(app).get('/auth/me');
    assert.equal(res.status, 401);
  });

  it('refuse un jeton mal formé, falsifié ou expiré', async () => {
    const forged = jwt.sign({ role: 'technician' }, 'autre-secret-autre-secret-autre-secret', { subject: 'x' });
    const user = await testDb.db.collection('users').findOne({ email: 'ana@campus.fr' });
    const expired = jwt.sign({ role: 'user' }, config.jwt.accessSecret, { subject: user._id.toString(), expiresIn: -10 });
    for (const header of ['Bearer nimportequoi', `Bearer ${forged}`, `Bearer ${expired}`, 'Basic abc']) {
      const res = await request(app).get('/auth/me').set('Authorization', header);
      assert.equal(res.status, 401, header);
    }
  });

  it('refuse un jeton de rafraîchissement utilisé comme jeton d\'accès', async () => {
    const user = await testDb.db.collection('users').findOne({ email: 'ana@campus.fr' });
    const asRefresh = signRefreshToken({ id: user._id.toString(), role: user.role }, config);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${asRefresh}`);
    assert.equal(res.status, 401);
  });

  it('renvoie l\'utilisateur avec un jeton valide', async () => {
    const login = await request(app).post('/auth/login').send({ email: 'ana@campus.fr', password: PASSWORD });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${login.body.accessToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'ana@campus.fr');
  });

  it('le rôle vient de la base, pas du jeton', async () => {
    const user = await testDb.db.collection('users').findOne({ email: 'ana@campus.fr' });
    // Jeton portant un rôle technician falsifié mais signé avec le bon secret : la base fait foi.
    const token = signAccessToken({ id: user._id.toString(), role: 'technician' }, config);
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    assert.equal(res.body.user.role, ROLES.USER);
  });

  it('refuse un jeton dont le compte a disparu', async () => {
    const created = await register(validBody({ email: 'ghost@campus.fr' }));
    await testDb.db.collection('users').deleteOne({ email: 'ghost@campus.fr' });
    const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${created.body.accessToken}`);
    assert.equal(res.status, 401);
  });
});

describe('POST /auth/refresh et /auth/logout', () => {
  it('échange le cookie contre un nouveau jeton d\'accès', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: 'ana@campus.fr', password: PASSWORD });
    const res = await agent.post('/auth/refresh');
    assert.equal(res.status, 200);
    const me = await request(app).get('/auth/me').set('Authorization', `Bearer ${res.body.accessToken}`);
    assert.equal(me.status, 200);
  });

  it('refuse sans cookie, et avec un jeton d\'accès placé dans le cookie', async () => {
    assert.equal((await request(app).post('/auth/refresh')).status, 401);
    const user = await testDb.db.collection('users').findOne({ email: 'ana@campus.fr' });
    const accessAsCookie = signAccessToken({ id: user._id.toString(), role: user.role }, config);
    const res = await request(app).post('/auth/refresh').set('Cookie', `refresh_token=${accessAsCookie}`);
    assert.equal(res.status, 401);
  });

  it('logout supprime le cookie, ensuite refresh est refusé', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email: 'ana@campus.fr', password: PASSWORD });
    const out = await agent.post('/auth/logout');
    assert.equal(out.status, 204);
    const res = await agent.post('/auth/refresh');
    assert.equal(res.status, 401);
  });
});

describe('requireRole', () => {
  const mini = express();
  mini.get('/tech', authenticate({ db: null, config }), requireRole(ROLES.TECHNICIAN), (_req, res) => res.json({ ok: true }));
  mini.use(errorHandler);

  it('sans utilisateur authentifié : 401', async () => {
    const res = await request(mini).get('/tech');
    assert.equal(res.status, 401);
  });

  it('un user est refusé (403), un technicien est accepté', async () => {
    const ana = await testDb.db.collection('users').findOne({ email: 'ana@campus.fr' });
    const tech = await testDb.db.collection('users').findOne({ email: 'tech@campus.fr' });
    const guarded = express();
    guarded.get('/tech', authenticate({ db: testDb.db, config }), requireRole(ROLES.TECHNICIAN), (_req, res) => res.json({ ok: true }));
    guarded.use(errorHandler);

    const asUser = signAccessToken({ id: ana._id.toString(), role: ana.role }, config);
    const asTech = signAccessToken({ id: tech._id.toString(), role: tech.role }, config);
    assert.equal((await request(guarded).get('/tech').set('Authorization', `Bearer ${asUser}`)).status, 403);
    assert.equal((await request(guarded).get('/tech').set('Authorization', `Bearer ${asTech}`)).status, 200);
  });
});
