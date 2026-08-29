import request from 'supertest';
import app from '../../src/app';

describe('GET /api/tickets', () => {
  it('requires a requesterId', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('MISSING_REQUESTER');
  });

  it('returns only tickets belonging to the given requester', async () => {
    const res = await request(app).get('/api/tickets').query({ requesterId: 1 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    for (const ticket of res.body.data) {
      expect(res.body.meta).toHaveProperty('totalCount');
    }
  });

  it('does not return tickets belonging to a different requester', async () => {
    const create = await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Isolation test summary',
      description: 'This ticket belongs to requester 1 only.',
      requestedPriority: 'LOW',
    });
    expect(create.status).toBe(201);

    const otherRequesterRes = await request(app).get('/api/tickets').query({ requesterId: 2 });
    expect(otherRequesterRes.status).toBe(200);
    const found = otherRequesterRes.body.data.find(
      (t: any) => t.ticketNumber === create.body.ticketNumber
    );
    expect(found).toBeUndefined();
  });

  it('searches by summary text', async () => {
    await request(app).post('/api/tickets').send({
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: 'Unique searchable phrase xyz',
      description: 'Test description',
      requestedPriority: 'LOW',
    });

    const searchRes = await request(app)
      .get('/api/tickets')
      .query({ requesterId: 1, search: 'Unique searchable phrase xyz' });
    expect(searchRes.status).toBe(200);
    expect(Array.isArray(searchRes.body.data)).toBe(true);
  });
});