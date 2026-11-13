const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createTicketSchema, updateTicketSchema, messageSchema } = require('../validation/tickets');
const {
  listTickets,
  createTicket,
  findVisibleTicket,
  updateTicket,
  changeStatus,
  serialize,
} = require('../services/tickets');
const { listMessages, createMessage } = require('../services/messages');
const { listHistory } = require('../services/history');

function buildTicketsRouter({ db, config }) {
  const router = express.Router();
  router.use(authenticate({ db, config }));

  router.get('/', async (req, res) => {
    res.json({ tickets: await listTickets(db, req.user) });
  });

  router.post('/', validate(createTicketSchema), async (req, res) => {
    res.status(201).json({ ticket: await createTicket(db, req.user, req.body) });
  });

  router.get('/:id', async (req, res) => {
    const ticket = await findVisibleTicket(db, req.params.id, req.user);
    res.json({ ticket: serialize(ticket) });
  });

  router.patch('/:id', validate(updateTicketSchema), async (req, res) => {
    res.json({ ticket: await updateTicket(db, req.params.id, req.user, req.body) });
  });

  for (const action of ['take', 'release', 'close', 'reopen']) {
    router.post(`/:id/${action}`, async (req, res) => {
      res.json({ ticket: await changeStatus(db, req.params.id, req.user, action) });
    });
  }

  router.get('/:id/messages', async (req, res) => {
    res.json({ messages: await listMessages(db, req.params.id, req.user) });
  });

  router.post('/:id/messages', validate(messageSchema), async (req, res) => {
    res.status(201).json({
      message: await createMessage(db, req.params.id, req.user, req.body.content),
    });
  });

  router.get('/:id/history', async (req, res) => {
    res.json({ history: await listHistory(db, req.params.id, req.user) });
  });

  return router;
}

module.exports = { buildTicketsRouter };
