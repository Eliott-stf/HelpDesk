const { findVisibleTicket } = require('./tickets');

function serialize(doc) {
  return {
    id: doc._id.toString(),
    ticketId: doc.ticketId.toString(),
    authorId: doc.authorId.toString(),
    type: doc.type,
    field: doc.field,
    oldValue: doc.oldValue,
    newValue: doc.newValue,
    createdAt: doc.createdAt,
  };
}

async function listHistory(db, id, user) {
  const ticket = await findVisibleTicket(db, id, user);
  const history = await db.collection('ticket_history')
    .find({ ticketId: ticket._id })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return history.map(serialize);
}

module.exports = { listHistory };
