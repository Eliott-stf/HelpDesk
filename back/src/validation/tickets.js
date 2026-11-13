const { z } = require('zod');
const { CATEGORIES, LIMITS } = require('../constants');

const ticketFields = {
  title: z.string().trim().min(LIMITS.title.min).max(LIMITS.title.max),
  description: z.string().trim().min(LIMITS.description.min).max(LIMITS.description.max),
  category: z.enum(CATEGORIES),
};

const createTicketSchema = z.object(ticketFields).strict();
const updateTicketSchema = z.object(ticketFields).partial().strict().refine(
  (value) => Object.keys(value).length > 0,
  'Au moins un champ doit être modifié',
);
const messageSchema = z.object({
  content: z.string().trim().min(LIMITS.message.min).max(LIMITS.message.max),
}).strict();

module.exports = { createTicketSchema, updateTicketSchema, messageSchema };
