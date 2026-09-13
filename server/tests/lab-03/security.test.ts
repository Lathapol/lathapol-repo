import { hashPassword, verifyPassword, validPassword, transitions } from '../../src/security';

describe('Lab 3 password and workflow policy', () => {
  it('stores salted hashes and rejects wrong passwords', async () => {
    const password = 'A lab password 123!';
    const a = await hashPassword(password);
    const b = await hashPassword(password);
    expect(a).not.toBe(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword('wrong password', a)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyPassword(password, 'broken')).toBe(false);
  });
  it.each([[11,false],[12,true],[128,true],[129,false]])('enforces length %s', (n,valid) => {
    expect(validPassword('x'.repeat(n as number))).toBe(valid);
  });
  it('has eight statuses with terminal closed and cancelled states', () => {
    expect(Object.keys(transitions)).toHaveLength(8);
    expect(transitions.NEW).toEqual(['OPEN','CANCELLED']);
    expect(transitions.RESOLVED).toEqual(['CLOSED','REOPENED']);
    expect(transitions.CLOSED).toEqual([]);
    expect(transitions.CANCELLED).toEqual([]);
  });
});
