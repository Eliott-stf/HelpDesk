// Validateurs JSON Schema MongoDB et index, d'après modelisation/05-passage-mongodb.md.
const { ROLES, STATUS, CATEGORIES, HISTORY_TYPES, HISTORY_FIELDS, LIMITS } = require('./constants');

const objectId = { bsonType: 'objectId' };

const validators = {
  users: {
    bsonType: 'object',
    required: ['email', 'passwordHash', 'name', 'role', 'createdAt'],
    properties: {
      email: { bsonType: 'string', maxLength: LIMITS.email.max },
      passwordHash: { bsonType: 'string' },
      name: { bsonType: 'string', minLength: LIMITS.name.min, maxLength: LIMITS.name.max },
      role: { enum: Object.values(ROLES) },
      createdAt: { bsonType: 'date' },
    },
  },
  tickets: {
    bsonType: 'object',
    required: ['title', 'description', 'category', 'status', 'authorId', 'createdAt', 'updatedAt'],
    properties: {
      title: { bsonType: 'string', minLength: LIMITS.title.min, maxLength: LIMITS.title.max },
      description: {
        bsonType: 'string',
        minLength: LIMITS.description.min,
        maxLength: LIMITS.description.max,
      },
      category: { enum: [...CATEGORIES] },
      status: { enum: Object.values(STATUS) },
      authorId: objectId,
      assigneeId: { bsonType: ['objectId', 'null'] },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
  messages: {
    bsonType: 'object',
    required: ['ticketId', 'authorId', 'content', 'createdAt'],
    properties: {
      ticketId: objectId,
      authorId: objectId,
      content: { bsonType: 'string', minLength: LIMITS.message.min, maxLength: LIMITS.message.max },
      createdAt: { bsonType: 'date' },
    },
  },
  ticket_history: {
    bsonType: 'object',
    required: ['ticketId', 'authorId', 'type', 'field', 'oldValue', 'newValue', 'createdAt'],
    properties: {
      ticketId: objectId,
      authorId: objectId,
      type: { enum: Object.values(HISTORY_TYPES) },
      field: { enum: [...HISTORY_FIELDS] },
      oldValue: { bsonType: 'string', maxLength: LIMITS.description.max },
      newValue: { bsonType: 'string', maxLength: LIMITS.description.max },
      createdAt: { bsonType: 'date' },
    },
  },
};

const indexes = {
  users: [{ key: { email: 1 }, options: { unique: true, name: 'users_email_unique' } }],
  tickets: [
    { key: { authorId: 1, updatedAt: -1 }, options: { name: 'tickets_author_updated' } },
    { key: { status: 1, updatedAt: -1 }, options: { name: 'tickets_status_updated' } },
    { key: { assigneeId: 1, status: 1 }, options: { name: 'tickets_assignee_status' } },
  ],
  messages: [{ key: { ticketId: 1, createdAt: 1 }, options: { name: 'messages_ticket_created' } }],
  ticket_history: [
    { key: { ticketId: 1, createdAt: 1 }, options: { name: 'history_ticket_created' } },
  ],
};

module.exports = { validators, indexes };
