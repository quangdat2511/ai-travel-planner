import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

// An opaque, signed paging cursor (contract 4.6): base64url(JSON) "." base64url(HMAC-SHA256).

const payloadSchema = z.strictObject({
  v: z.literal(1),
  /** Hash of the filters of the walk (filterKey). */
  f: z.string(),
  /** Sort key and id of the last place on the page before. */
  k: z.tuple([z.string(), z.string()]),
  /** The instant that openAt=now stands for in this walk, or null. */
  t: z.number().nullable(),
  /** When the first page of the walk was served, in ms since the epoch. */
  s: z.number(),
});

export type CursorPayload = z.infer<typeof payloadSchema>;

export function hashFilters(filterKey: string): string {
  return createHash('sha256').update(filterKey).digest('base64url').slice(0, 22);
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

export function encodeCursor(payload: CursorPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** The payload, or null when the cursor was not made with this secret or was changed. */
export function decodeCursor(cursor: string, secret: string): CursorPayload | null {
  const parts = cursor.split('.');
  if (parts.length !== 2) return null;
  const [body = '', signature = ''] = parts;
  // Compare the signature as text. Decoded bytes would ignore a changed last
  // base64url character, whose low bits are padding.
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const parsed = payloadSchema.safeParse(JSON.parse(Buffer.from(body, 'base64url').toString()));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
