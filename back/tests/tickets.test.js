const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');
const { loadConfig } = require('../src/config');
const { ROLES, STATUS } = require('../src/constants');
const { startTestDb } = require('./helpers/testDb');
const { PASSWORD, seedUser, loginHeader } = require('./helpers/auth');

let testDb;
let app;
let user;
let otherUser;
let technician;
let otherTechnician;
let userAuth;
let otherUserAuth;
let technicianAuth;
let otherTechnicianAuth;

const ticketBody = (over = {}) => ({
  title: 'Wi-Fi coupé',
  description: 'Plus de réseau en salle B12',
  category: 'Réseau',
  ...over,
});

async function createAs(auth, body = ticketBody()) {
  return request(app).post('/tickets').set(auth).send(body);
}

before(async () => {
  testDb = await startTestDb();
  app = createApp({ db: testDb.db, config: loadConfig({}) });
  user = await seedUser(testDb.db, { email: 'ana@campus.fr', name: 'Ana' });
  otherUser = await seedUser(testDb.db, { email: 'luc@campus.fr', name: 'Luc' });
  technician = await seedUser(testDb.db, {
    email: 'tech@campus.fr',
    name: 'Tech',
    role: ROLES.TECHNICIAN,
  });
  otherTechnician = await seedUser(testDb.db, {
    email: 'tech2@campus.fr',
    name: 'Tech 2',
    role: ROLES.TECHNICIAN,
  });
  userAuth = await loginHeader(request, app, user.email);
  otherUserAuth = await loginHeader(request, app, otherUser.email);
  technicianAuth = await loginHeader(request, app, technician.email);
  otherTechnicianAuth = await loginHeader(request, app, otherTechnician.email);
});

after(async () => {
  if (testDb) await testDb.stop();
});

describe('tickets et visibilité', () => {
  it('RG5-RG8 : un user crée un ticket ouvert et non assigné', async () => {
    const res = await createAs(userAuth);
    assert.equal(res.status, 201);
    assert.equal(res.body.ticket.status, STATUS.OPEN);
    assert.equal(res.body.ticket.assigneeId, null);
    assert.equal(res.body.ticket.authorId, user._id.toString());
  });

  it('RG6 : un technicien ne peut pas créer de ticket', async () => {
    const res = await createAs(technicianAuth);
    assert.equal(res.status, 403);
  });

  it('RG10 : un user ne voit que ses tickets et un technicien voit tout', async () => {
    await createAs(otherUserAuth, ticketBody({ title: 'Compte bloqué' }));
    const mine = await request(app).get('/tickets').set(userAuth);
    const all = await request(app).get('/tickets').set(technicianAuth);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.tickets.length, 1);
    assert.equal(all.body.tickets.length, 2);
  });

  it('RG10 : un autre user ne peut pas voir le détail, les messages ou l’historique', async () => {
    const ticket = (await createAs(userAuth, ticketBody({ title: 'Ticket privé' }))).body.ticket;
    for (const path of [`/tickets/${ticket.id}`, `/tickets/${ticket.id}/messages`, `/tickets/${ticket.id}/history`]) {
      assert.equal((await request(app).get(path).set(otherUserAuth)).status, 403);
    }
  });
});

describe('contenu, messages et historique', () => {
  it('RG11 et RG21 : l’auteur modifie un ticket ouvert, champ par champ dans l’historique', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    const res = await request(app).patch(`/tickets/${ticket.id}`).set(userAuth)
      .send({ title: 'Wi-Fi rétabli', category: 'Matériel' });
    assert.equal(res.status, 200);
    const history = await request(app).get(`/tickets/${ticket.id}/history`).set(userAuth);
    assert.equal(history.body.history.length, 2);
    assert.deepEqual(history.body.history.map((entry) => entry.field).sort(), ['category', 'title']);
  });

  it('RG11 : ni un autre user ni un technicien ne modifie le contenu', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    assert.equal((await request(app).patch(`/tickets/${ticket.id}`).set(otherUserAuth).send({ title: 'Non' })).status, 403);
    assert.equal((await request(app).patch(`/tickets/${ticket.id}`).set(technicianAuth).send({ title: 'Non' })).status, 403);
  });

  it('RG17-RG19 : auteur et technicien assigné répondent, message immuable', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    assert.equal((await request(app).post(`/tickets/${ticket.id}/messages`).set(userAuth)
      .send({ content: 'Voici une précision.' })).status, 201);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/messages`).set(technicianAuth)
      .send({ content: 'Je vais regarder.' })).status, 403);
    await request(app).post(`/tickets/${ticket.id}/take`).set(technicianAuth);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/messages`).set(technicianAuth)
      .send({ content: 'Je prends le ticket.' })).status, 201);
    const messages = await request(app).get(`/tickets/${ticket.id}/messages`).set(otherTechnicianAuth);
    assert.equal(messages.body.messages.length, 2);
  });
});

describe('transitions atomiques et droits', () => {
  it('RG12 : le premier technicien prend le ticket, le second reçoit 409', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    assert.equal((await request(app).post(`/tickets/${ticket.id}/take`).set(technicianAuth)).status, 200);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/take`).set(otherTechnicianAuth)).status, 409);
    const detail = await request(app).get(`/tickets/${ticket.id}`).set(technicianAuth);
    assert.equal(detail.body.ticket.assigneeId, technician._id.toString());
  });

  it('RG13-RG14 : seul l’assigné libère ou ferme et chaque statut est historisé', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    await request(app).post(`/tickets/${ticket.id}/take`).set(technicianAuth);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/release`).set(otherTechnicianAuth)).status, 409);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/close`).set(technicianAuth)).status, 200);
    const history = await request(app).get(`/tickets/${ticket.id}/history`).set(userAuth);
    assert.deepEqual(history.body.history.map((entry) => entry.newValue), [STATUS.IN_PROGRESS, STATUS.CLOSED]);
  });

  it('RG15-RG16 : l’auteur peut rouvrir, l’assignation est retirée et une transition interdite est refusée', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    await request(app).post(`/tickets/${ticket.id}/take`).set(technicianAuth);
    await request(app).post(`/tickets/${ticket.id}/close`).set(technicianAuth);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/take`).set(otherTechnicianAuth)).status, 409);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/reopen`).set(userAuth)).status, 200);
    const detail = await request(app).get(`/tickets/${ticket.id}`).set(userAuth);
    assert.equal(detail.body.ticket.status, STATUS.OPEN);
    assert.equal(detail.body.ticket.assigneeId, null);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/close`).set(technicianAuth)).status, 409);
  });

  it('RG18 : un ticket fermé refuse les réponses et les modifications', async () => {
    const ticket = (await createAs(userAuth)).body.ticket;
    await request(app).post(`/tickets/${ticket.id}/take`).set(technicianAuth);
    await request(app).post(`/tickets/${ticket.id}/close`).set(technicianAuth);
    assert.equal((await request(app).post(`/tickets/${ticket.id}/messages`).set(userAuth)
      .send({ content: 'Encore une réponse' })).status, 403);
    assert.equal((await request(app).patch(`/tickets/${ticket.id}`).set(userAuth)
      .send({ title: 'Modification tardive' })).status, 403);
  });
});
