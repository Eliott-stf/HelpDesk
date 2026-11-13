const { ObjectId } = require('mongodb');
const { ROLES, STATUS, HISTORY_TYPES } = require('../constants');
const { badRequest, conflict, forbidden, notFound } = require('../errors');

function toObjectId(id) {
  if (!ObjectId.isValid(id)) throw badRequest('Identifiant de ticket invalide');
  return new ObjectId(id);
}

function serialize(doc) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    category: doc.category,
    status: doc.status,
    authorId: doc.authorId.toString(),
    assigneeId: doc.assigneeId ? doc.assigneeId.toString() : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function canSee(ticket, user) {
  return user.role === ROLES.TECHNICIAN || ticket.authorId.toString() === user.id;
}

async function findVisibleTicket(db, id, user) {
  const ticket = await db.collection('tickets').findOne({ _id: toObjectId(id) });
  if (!ticket) throw notFound('Ticket introuvable');
  if (!canSee(ticket, user)) throw forbidden('Vous ne pouvez pas accéder à ce ticket');
  return ticket;
}

async function listTickets(db, user) {
  const filter = user.role === ROLES.USER ? { authorId: new ObjectId(user.id) } : {};
  const tickets = await db.collection('tickets').find(filter).sort({ updatedAt: -1 }).toArray();
  return tickets.map(serialize);
}

async function createTicket(db, user, fields) {
  if (user.role !== ROLES.USER) throw forbidden('Seul un utilisateur peut créer un ticket');
  const now = new Date();
  const doc = {
    ...fields,
    status: STATUS.OPEN,
    authorId: new ObjectId(user.id),
    assigneeId: null,
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await db.collection('tickets').insertOne(doc);
  return serialize({ ...doc, _id: insertedId });
}

async function updateTicket(db, id, user, fields) {
  const ticket = await findVisibleTicket(db, id, user);
  if (ticket.authorId.toString() !== user.id || ticket.status !== STATUS.OPEN) {
    throw forbidden('Seul l’auteur peut modifier un ticket ouvert');
  }

  const changes = Object.entries(fields).filter(([field, value]) => ticket[field] !== value);
  if (changes.length === 0) return serialize(ticket);
  const now = new Date();
  const updated = await db.collection('tickets').findOneAndUpdate(
    { _id: ticket._id, authorId: new ObjectId(user.id), status: STATUS.OPEN },
    { $set: { ...fields, updatedAt: now } },
    { returnDocument: 'after' },
  );
  if (!updated) throw conflict('Le ticket a changé entre-temps');

  await db.collection('ticket_history').insertMany(changes.map(([field, value]) => ({
    ticketId: ticket._id,
    authorId: new ObjectId(user.id),
    type: HISTORY_TYPES.CONTENT,
    field,
    oldValue: ticket[field],
    newValue: value,
    createdAt: now,
  })));
  return serialize(updated);
}

async function changeStatus(db, id, user, action) {
  const ticketId = toObjectId(id);
  const current = await db.collection('tickets').findOne({ _id: ticketId });
  if (!current) throw notFound('Ticket introuvable');

  let filter;
  let update;
  let nextStatus;
  if (action === 'take') {
    if (user.role !== ROLES.TECHNICIAN) throw forbidden('Seul un technicien peut prendre un ticket');
    filter = { _id: ticketId, status: STATUS.OPEN, assigneeId: null };
    nextStatus = STATUS.IN_PROGRESS;
    update = { status: nextStatus, assigneeId: new ObjectId(user.id) };
  } else if (action === 'release') {
    filter = { _id: ticketId, status: STATUS.IN_PROGRESS, assigneeId: new ObjectId(user.id) };
    nextStatus = STATUS.OPEN;
    update = { status: nextStatus, assigneeId: null };
  } else if (action === 'close') {
    filter = { _id: ticketId, status: STATUS.IN_PROGRESS, assigneeId: new ObjectId(user.id) };
    nextStatus = STATUS.CLOSED;
    update = { status: nextStatus };
  } else if (action === 'reopen') {
    if (user.role !== ROLES.TECHNICIAN && current.authorId.toString() !== user.id) {
      throw forbidden('Seul l’auteur ou un technicien peut rouvrir ce ticket');
    }
    filter = { _id: ticketId, status: STATUS.CLOSED };
    nextStatus = STATUS.OPEN;
    update = { status: nextStatus, assigneeId: null };
  } else {
    throw badRequest('Opération de statut inconnue');
  }

  const now = new Date();
  const updated = await db.collection('tickets').findOneAndUpdate(
    filter,
    { $set: { ...update, updatedAt: now } },
    { returnDocument: 'after' },
  );
  if (!updated) throw conflict('Transition de statut impossible dans l’état actuel');

  await db.collection('ticket_history').insertOne({
    ticketId,
    authorId: new ObjectId(user.id),
    type: HISTORY_TYPES.STATUS,
    field: 'status',
    oldValue: current.status,
    newValue: nextStatus,
    createdAt: now,
  });
  return serialize(updated);
}

module.exports = {
  serialize,
  canSee,
  findVisibleTicket,
  listTickets,
  createTicket,
  updateTicket,
  changeStatus,
  toObjectId,
};
