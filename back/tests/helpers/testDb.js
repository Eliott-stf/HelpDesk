const { MongoMemoryServer } = require('mongodb-memory-server');
const { connect, ensureSchema } = require('../../src/db');

// Même version majeure que le MongoDB du docker-compose.yml (mongo:7.0).
const MONGO_VERSION = '7.0.14';

// Démarre un MongoDB en mémoire, applique le schéma réel (validateurs + index) et le renvoie.
async function startTestDb() {
  const mongod = await MongoMemoryServer.create({ binary: { version: MONGO_VERSION } });
  const { client, db } = await connect(mongod.getUri(), 'helpdesk_test');
  await ensureSchema(db);
  return {
    db,
    async stop() {
      await client.close();
      await mongod.stop();
    },
  };
}

module.exports = { startTestDb };
