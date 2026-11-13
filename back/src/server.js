const { loadConfig } = require('./config');
const { connect, ensureSchema } = require('./db');
const { createApp } = require('./app');

async function main() {
  const config = loadConfig();
  const { client, db } = await connect(config.mongoUri, config.dbName);
  await ensureSchema(db);

  const app = createApp({ db, config });
  const server = app.listen(config.port, () => {
    console.log(`API HelpDesk Campus sur http://localhost:${config.port} (base "${config.dbName}")`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} reçu, arrêt en cours...`);
    server.close(async () => {
      await client.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Démarrage impossible :', err.message);
  process.exit(1);
});
