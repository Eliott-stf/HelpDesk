const { ObjectId } = require('mongodb');
const { ROLES, STATUS } = require('../constants');
const { forbidden, notFound } = require('../errors');
const { canSee, findVisibleTicket, toObjectId } = require('./tickets');

function serialize(doc) {
  return {
    id: doc._id.toString(),
    ticketId: doc.ticketId.toString(),
    authorId: doc.authorId.toString(),
    content: doc.content,
    createdAt: doc.createdAt,
  };
}

async function listMessages(db, id, user) {
  const ticket = await findVisibleTicket(db, id, user);
  const messages = await db.collection('messages')
    .find({ ticketId: ticket._id })
    .sort({ createdAt: 1 })
    .toArray();
  return messages.map(serialize);
}

async function createMessage(db, id, user, content) {
  const ticket = await findVisibleTicket(db, id, user);
  const allowed = ticket.authorId.toString() === user.id
    || (user.role === ROLES.TECHNICIAN && ticket.assigneeId?.toString() === user.id);
  if (!allowed) throw forbidden('Vous ne pouvez pas répondre à ce ticket');
  if (ticket.status === STATUS.CLOSED) throw forbidden('Un ticket fermé ne peut plus recevoir de réponse');

  const now = new Date();
  const doc = { ticketId: toObjectId(id), authorId: new ObjectId(user.id), content, createdAt: now };
  const { insertedId } = await db.collection('messages').insertOne(doc);
  await db.collection('tickets').updateOne({ _id: ticket._id }, { $set: { updatedAt: now } });
  return serialize({ ...doc, _id: insertedId });
}

module.exports = { listMessages, createMessage };
