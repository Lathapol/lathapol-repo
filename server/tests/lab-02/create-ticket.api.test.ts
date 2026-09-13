import { client, prepareSessions, closeSessions } from '../session-helper';
beforeAll(prepareSessions);
afterAll(closeSessions);
import request from 'supertest';
import app from '../../src/app';

describe('POST /api/tickets', () => {
  it('creates a valid ticket and returns 201 with a ticket number', async () => {
    const res = await client().post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Test ticket summary',
      description: 'This is a valid test description for the ticket.',
      requestedPriority: 'MEDIUM',
    });

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe('NEW');
  });

  it('rejects a ticket with a summary that is too short', async () => {
    const res = await client().post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Hi',
      description: 'This is a valid test description for the ticket.',
      requestedPriority: 'MEDIUM',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_SUMMARY');
  });

  it('rejects a ticket with an empty description', async () => {
    const res = await client().post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Valid summary text',
      description: '',
      requestedPriority: 'MEDIUM',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_DESCRIPTION');
  });

  it('ignores a spoofed requester ID', async () => {
    const res = await client().post('/api/tickets').send({
      requesterId: 999,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Valid summary text',
      description: 'This is a valid test description for the ticket.',
      requestedPriority: 'MEDIUM',
    });

    expect(res.status).toBe(201);
    expect(res.body.requesterId).toBe(1);
  });
});