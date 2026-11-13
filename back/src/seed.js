const { loadConfig } = require('./config');
const { connect, ensureSchema } = require('./db');
const { ROLES, STATUS, HISTORY_TYPES } = require('./constants');
const { hashPassword } = require('./services/passwords');

const SEED_PASSWORD = 'campus1234';

async function main() {
  const config = loadConfig();
  const { client, db } = await connect(config.mongoUri, config.dbName);
  try {
    await ensureSchema(db);
    await Promise.all(['users', 'tickets', 'messages', 'ticket_history']
      .map((name) => db.collection(name).deleteMany({})));

    const passwordHash = await hashPassword(SEED_PASSWORD);
    const users = [
      { email: 'ana@campus.fr', name: 'Ana Martin', role: ROLES.USER },
      { email: 'luc@campus.fr', name: 'Luc Bernard', role: ROLES.USER },
      { email: 'sarah@campus.fr', name: 'Sarah Petit', role: ROLES.USER },
      { email: 'marc.tech@campus.fr', name: 'Marc Technicien', role: ROLES.TECHNICIAN },
      { email: 'ines.tech@campus.fr', name: 'Inès Technicienne', role: ROLES.TECHNICIAN },
    ].map((user) => ({ ...user, passwordHash, createdAt: new Date() }));
    const userResult = await db.collection('users').insertMany(users);
    const [ana, luc, sarah, marc, ines] = users.map((_, index) => userResult.insertedIds[index]);

    const tickets = [
      ['Wi-Fi indisponible en B12', 'La connexion Wi-Fi ne fonctionne plus dans la salle B12.', 'Réseau', STATUS.OPEN, ana, null],
      ['Installation du logiciel de calcul', 'Le logiciel demandé pour le cours de calcul est absent.', 'Logiciel', STATUS.IN_PROGRESS, ana, marc],
      ['Compte campus bloqué', 'Le mot de passe du compte campus est refusé depuis ce matin.', 'Compte/Accès', STATUS.CLOSED, luc, ines],
      ['Écran qui clignote', 'L’écran du poste 204 clignote après quelques minutes.', 'Matériel', STATUS.OPEN, luc, null],
      ['Accès VPN impossible', 'Le VPN refuse la connexion depuis le réseau de la résidence.', 'Réseau', STATUS.IN_PROGRESS, sarah, ines],
      ['Demande de clavier', 'Le clavier de la salle C03 a plusieurs touches cassées.', 'Matériel', STATUS.CLOSED, sarah, marc],
      ['Question sur les imprimantes', 'La file d’impression du bâtiment A reste bloquée.', 'Autre', STATUS.OPEN, ana, null],
    ].map(([title, description, category, status, authorId, assigneeId], index) => {
      const createdAt = new Date(Date.now() - (7 - index) * 86400000);
      return {
        title, description, category, status, authorId, assigneeId, createdAt,
        updatedAt: new Date(createdAt.getTime() + 3600000),
      };
    });
    const ticketResult = await db.collection('tickets').insertMany(tickets);
    const ticketIds = tickets.map((_, index) => ticketResult.insertedIds[index]);

    const messages = [
      [1, ana, 'Pouvez-vous installer la version utilisée en cours ?'],
      [1, marc, 'Installation prévue cet après-midi.'],
      [2, luc, 'Merci, le compte fonctionne à nouveau.'],
      [4, sarah, 'Le VPN est maintenant opérationnel.'],
      [5, sarah, 'Le nouveau clavier a été installé.'],
    ].map(([ticketIndex, authorId, content], index) => ({
      ticketId: ticketIds[ticketIndex],
      authorId,
      content,
      createdAt: new Date(Date.now() - (5 - index) * 3600000),
    }));
    await db.collection('messages').insertMany(messages);

    const history = [];
    for (const [index, ticket] of tickets.entries()) {
      if (ticket.status !== STATUS.OPEN) {
        history.push({
          ticketId: ticketIds[index],
          authorId: ticket.assigneeId,
          type: HISTORY_TYPES.STATUS,
          field: 'status',
          oldValue: STATUS.OPEN,
          newValue: STATUS.IN_PROGRESS,
          createdAt: ticket.updatedAt,
        });
      }
      if (ticket.status === STATUS.CLOSED) {
        history.push({
          ticketId: ticketIds[index],
          authorId: ticket.assigneeId,
          type: HISTORY_TYPES.STATUS,
          field: 'status',
          oldValue: STATUS.IN_PROGRESS,
          newValue: STATUS.CLOSED,
          createdAt: new Date(ticket.updatedAt.getTime() + 1000),
        });
      }
    }
    await db.collection('ticket_history').insertMany(history);

    console.log(`Seed terminé : ${users.length} utilisateurs, ${tickets.length} tickets.`);
    console.log(`Mot de passe de démonstration : ${SEED_PASSWORD}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error('Seed impossible :', err.message);
  process.exitCode = 1;
});
