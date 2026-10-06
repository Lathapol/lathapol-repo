import { randomUUID } from 'crypto';
import { followUpError, parseCreate, parseUpdate } from '../../src/actionValidation';

const base = () => ({ requestKey: randomUUID(), description: '  Fixed it ', result: ' Works ' });

test('UNIT-01 trims valid input and applies defaults', () => {
  const parsed = parseCreate(base());
  expect('data' in parsed && parsed.data).toMatchObject({ description: 'Fixed it', result: 'Works', followUpRequired: false, followUpNote: null, attachmentNotes: null });
});

test('UNIT-01 enforces length windows at their edges', () => {
  expect('data' in parseCreate({ ...base(), description: 'x'.repeat(2000) })).toBe(true);
  expect('error' in parseCreate({ ...base(), description: 'x'.repeat(2001) })).toBe(true);
  expect('data' in parseCreate({ ...base(), attachmentNotes: 'x'.repeat(500) })).toBe(true);
  expect('error' in parseCreate({ ...base(), attachmentNotes: 'x'.repeat(501) })).toBe(true);
  expect('data' in parseCreate({ ...base(), followUpRequired: true, followUpNote: 'x'.repeat(1000) })).toBe(true);
  expect('error' in parseCreate({ ...base(), followUpRequired: true, followUpNote: 'x'.repeat(1001) })).toBe(true);
});

test('UNIT-01 follow-up rule: note required when true, dropped when false', () => {
  expect(followUpError(true, null)).toBeTruthy();
  expect(followUpError(true, 'call back')).toBeNull();
  expect(followUpError(false, null)).toBeNull();
  const dropped = parseCreate({ ...base(), followUpRequired: false, followUpNote: 'ignored' });
  expect('data' in dropped && dropped.data.followUpNote).toBeNull();
  expect('error' in parseCreate({ ...base(), followUpRequired: true })).toBe(true);
});

test('UNIT-01 rejects unknown keys, non-objects and bad request keys', () => {
  for (const body of [null, 'x', [1], { ...base(), performedById: 1 }, { ...base(), requestKey: '123' }, { description: 'a', result: 'b' }]) {
    expect('error' in parseCreate(body)).toBe(true);
  }
});

test('UNIT-01 update needs a version and at least one known field', () => {
  expect('data' in parseUpdate({ version: 0, result: 'ok' })).toBe(true);
  for (const body of [{ result: 'ok' }, { version: -1, result: 'ok' }, { version: 1.5, result: 'ok' }, { version: 0 }, { version: 0, requestKey: randomUUID() }, { version: 0, result: '' }]) {
    expect('error' in parseUpdate(body)).toBe(true);
  }
});
