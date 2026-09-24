const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export type ActionFields = {
  description?: string;
  result?: string;
  followUpRequired?: boolean;
  followUpNote?: string | null;
  attachmentNotes?: string | null;
};
export type Parsed<T> = { data: T } | { error: string };

// Trimmed text with a length window; optional text may be blank and becomes null.
function text(value: unknown, max: number, required: boolean): string | null | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return required ? undefined : null;
  return trimmed.length > max ? undefined : trimmed;
}

// Follow-up rule (BR-06): a note is required when follow-up is needed, otherwise discarded.
export function followUpError(required: boolean, note: string | null | undefined) {
  return required && !note ? 'Enter a follow-up note (1-1000 characters) when follow-up is required.' : null;
}

function parseFields(body: Record<string, unknown>, partial: boolean): Parsed<ActionFields> {
  const data: ActionFields = {};
  const has = (key: string) => key in body;
  for (const [key, label] of [['description', 'Description'], ['result', 'Result']] as const) {
    if (has(key) || !partial) {
      const value = text(body[key], 2000, true);
      if (typeof value !== 'string') return { error: `${label} must be 1-2000 characters.` };
      data[key] = value;
    }
  }
  if (has('attachmentNotes')) {
    const value = body.attachmentNotes === null ? null : text(body.attachmentNotes, 500, false);
    if (value === undefined) return { error: 'Attachment notes must be at most 500 characters.' };
    data.attachmentNotes = value;
  }
  if (has('followUpRequired')) {
    if (typeof body.followUpRequired !== 'boolean') return { error: 'Follow-up required must be true or false.' };
    data.followUpRequired = body.followUpRequired;
  }
  if (has('followUpNote')) {
    const value = body.followUpNote === null ? null : text(body.followUpNote, 1000, false);
    if (value === undefined) return { error: 'Follow-up note must be at most 1000 characters.' };
    data.followUpNote = value;
  }
  return { data };
}

export function parseCreate(body: unknown): Parsed<{ requestKey: string; description: string; result: string; followUpRequired: boolean; followUpNote: string | null; attachmentNotes: string | null }> {
  const allowed = ['requestKey', 'description', 'result', 'followUpRequired', 'followUpNote', 'attachmentNotes'];
  if (!object(body) || Object.keys(body).some(k => !allowed.includes(k))) return { error: 'Invalid action.' };
  if (typeof body.requestKey !== 'string' || !UUID.test(body.requestKey)) return { error: 'A valid requestKey is required.' };
  const parsed = parseFields(body, false);
  if ('error' in parsed) return parsed;
  const followUpRequired = parsed.data.followUpRequired ?? false;
  const problem = followUpError(followUpRequired, parsed.data.followUpNote);
  if (problem) return { error: problem };
  return { data: {
    requestKey: body.requestKey.toLowerCase(),
    description: parsed.data.description!, result: parsed.data.result!,
    followUpRequired, followUpNote: followUpRequired ? parsed.data.followUpNote! : null,
    attachmentNotes: parsed.data.attachmentNotes ?? null,
  } };
}

export function parseUpdate(body: unknown): Parsed<ActionFields & { version: number }> {
  const allowed = ['version', 'description', 'result', 'followUpRequired', 'followUpNote', 'attachmentNotes'];
  if (!object(body) || Object.keys(body).some(k => !allowed.includes(k))) return { error: 'Invalid action update.' };
  const version = body.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0 || version >= 2147483647) return { error: 'A valid version is required.' };
  if (Object.keys(body).length < 2) return { error: 'Provide at least one field to change.' };
  const parsed = parseFields(body, true);
  if ('error' in parsed) return parsed;
  return { data: { ...parsed.data, version } };
}
