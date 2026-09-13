import { client, prepareSessions, closeSessions } from '../session-helper';
beforeAll(prepareSessions);
afterAll(closeSessions);
import request from 'supertest';
import app from '../../src/app';

describe('GET /api/requesters', () => {
  it('removes the public requester selector', async () => {
    const res = await client().get('/api/requesters');

    expect(res.status).toBe(404);
  });
});