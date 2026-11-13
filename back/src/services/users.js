const { ObjectId } = require('mongodb');
const { ROLES } = require('../constants');

// Représentation d'un utilisateur 
function publicUser(doc) {
  return { id: doc._id.toString(), email: doc.email, name: doc.name, role: doc.role };
}

async function createUser(db, { email, name, passwordHash, role = ROLES.USER }) {
  const doc = { email, name, passwordHash, role, createdAt: new Date() };
  const { insertedId } = await db.collection('users').insertOne(doc);
  return { ...doc, _id: insertedId };
}

function findUserByEmail(db, email) {
  return db.collection('users').findOne({ email });
}

async function findUserById(db, id) {
  if (!ObjectId.isValid(id)) return null;
  return db.collection('users').findOne({ _id: new ObjectId(id) });
}

module.exports = { publicUser, createUser, findUserByEmail, findUserById };
