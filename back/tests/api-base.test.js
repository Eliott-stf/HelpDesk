const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { z } = require('zod');
const express = require('express');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { validate } = require('../src/middleware/validate');
const { errorHandler } = require('../src/middleware/errorHandler');

// Ces tests n'ont pas besoin de MongoDB : le socle ne lit pas encore la base.
const app = createApp({ db: null, config: loadConfig({}) });

describe('API de base', () => {
  it('GET /health répond ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  it('une route inconnue renvoie une erreur JSON 404', async () => {
    const res = await request(app).get('/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
  });

  it('un JSON mal formé renvoie 400', async () => {
    const res = await request(app).post('/health').set('Content-Type', 'application/json').send('{oops');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
  });
});

describe('validation côté API (zod)', () => {
  const mini = express();
  mini.use(express.json());
  mini.post('/x', validate(z.object({ title: z.string().min(3) }).strict()), (req, res) => res.json(req.body));
  mini.use(errorHandler);

  it('refuse un corps invalide avec le détail des champs', async () => {
    const res = await request(mini).post('/x').send({ title: 'a' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'BAD_REQUEST');
    assert.equal(res.body.error.details[0].field, 'title');
  });

  it("refuse les champs inconnus (ex. role à l'inscription)", async () => {
    const res = await request(mini).post('/x').send({ title: 'abc', role: 'technician' });
    assert.equal(res.status, 400);
  });

  it('accepte un corps valide', async () => {
    const res = await request(mini).post('/x').send({ title: 'abc' });
    assert.equal(res.status, 200);
  });
});
