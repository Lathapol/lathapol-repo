import request from 'supertest';
import app from '../../src/app';

describe('GET /api/requesters', () => {
  it('returns only active requesters, sorted by name', async () => {
    const res = await request(app).get('/api/requesters');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4);

    const names = res.body.map((r: any) => r.name);
    expect(names).toContain('Jennifer Anderson');
    expect(names).not.toContain('Former Employee');

    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });
});