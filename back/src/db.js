const { MongoClient } = require('mongodb');
const { validators, indexes } = require('./schemas');

async function connect(uri, dbName) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const db = client.db(dbName);
  return { client, db };
}

// Crée les collections avec leur validateur (ou met le validateur à jour), puis les index.
// Idempotent : peut être relancé à chaque démarrage.
async function ensureSchema(db) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));

  for (const [name, $jsonSchema] of Object.entries(validators)) {
    const validator = { $jsonSchema };
    if (existing.has(name)) {
      await db.command({ collMod: name, validator, validationLevel: 'strict', validationAction: 'error' });
    } else {
      await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
    }
  }

  for (const [name, list] of Object.entries(indexes)) {
    const collection = db.collection(name);
    for (const { key, options } of list) {
      await collection.createIndex(key, options);
    }
  }
}

module.exports = { connect, ensureSchema };
