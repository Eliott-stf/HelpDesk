const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const { ensureSchema } = require('../src/db');
const { startTestDb } = require('./helpers/testDb');

let testDb;

before(async () => {
  testDb = await startTestDb();
});

after(async () => {
  if (testDb) await testDb.stop();
});

describe('schéma MongoDB (validateurs et index)', () => {
  const now = () => new Date();
  const validTicket = () => ({
    title: 'Wi-Fi coupé',
    description: 'Plus de réseau en salle B12',
    category: 'Réseau',
    status: 'OPEN',
    authorId: new ObjectId(),
    assigneeId: null,
    createdAt: now(),
    updatedAt: now(),
  });

  it('crée les 4 collections', async () => {
    const names = (await testDb.db.listCollections().toArray()).map((c) => c.name).sort();
    assert.deepEqual(names, ['messages', 'ticket_history', 'tickets', 'users']);
  });

  it('ensureSchema est idempotent', async () => {
    await assert.doesNotReject(ensureSchema(testDb.db));
  });

  it('accepte un ticket valide', async () => {
    const res = await testDb.db.collection('tickets').insertOne(validTicket());
    assert.ok(res.insertedId);
  });

  const invalidCases = [
    ['statut inconnu', { status: 'DONE' }],
    ['catégorie hors liste', { category: 'Cuisine' }],
    ['titre trop court', { title: 'a' }],
    ['auteur manquant', { authorId: undefined }],
  ];
  for (const [label, patch] of invalidCases) {
    it(`refuse un ticket invalide : ${label}`, async () => {
      const doc = { ...validTicket(), ...patch };
      await assert.rejects(testDb.db.collection('tickets').insertOne(doc), { code: 121 });
    });
  }

  it('refuse un rôle inconnu sur users', async () => {
    const doc = { email: 'a@b.fr', passwordHash: 'x', name: 'A', role: 'admin', createdAt: now() };
    await assert.rejects(testDb.db.collection('users').insertOne(doc), { code: 121 });
  });

  it("l'e-mail est unique (RG3)", async () => {
    const users = testDb.db.collection('users');
    const doc = () => ({ email: 'dup@campus.fr', passwordHash: 'x', name: 'D', role: 'user', createdAt: now() });
    await users.insertOne(doc());
    await assert.rejects(users.insertOne(doc()), { code: 11000 });
  });
});
