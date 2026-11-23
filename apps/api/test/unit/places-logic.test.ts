import { describe, expect, it } from 'vitest';
import { decodeCursor, encodeCursor, type CursorPayload } from '../../src/places/cursor.js';
import { cityClock, isOpenAt } from '../../src/places/hours.js';
import type { WeeklyHours } from '../../src/places/place.js';
import { parseInstant, parsePlacesQuery } from '../../src/places/query.js';
import { compareCodePoints, foldText } from '../../src/places/text.js';

const closed = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
const at = (iso: string) => new Date(iso).getTime();

describe('cityClock', () => {
  it('reads an instant in UTC+7, Monday first', () => {
    expect(cityClock(at('2026-11-29T17:30:00Z'))).toEqual({ dayIndex: 0, minute: 30 }); // Mon 00:30
    expect(cityClock(at('2026-11-28T07:00:00Z'))).toEqual({ dayIndex: 5, minute: 840 }); // Sat 14:00
  });
});

describe('isOpenAt', () => {
  const hours: WeeklyHours = {
    ...closed,
    fri: [{ open: '17:00', close: '01:00' }],
    sat: [{ open: '00:00', close: '24:00' }],
    sun: [{ open: '10:00', close: '10:00' }],
  };

  it('keeps an overnight interval open after midnight, until close', () => {
    expect(isOpenAt({ ...hours, sat: [] }, at('2026-11-27T17:59:00Z'))).toBe(true); // Sat 00:59
    expect(isOpenAt({ ...hours, sat: [] }, at('2026-11-27T18:00:00Z'))).toBe(false); // Sat 01:00
  });

  it('reads 00:00 to 24:00 as the whole day', () => {
    expect(isOpenAt(hours, at('2026-11-28T16:59:00Z'))).toBe(true); // Sat 23:59
  });

  it('reads an equal open and close as 24 hours from open', () => {
    expect(isOpenAt(hours, at('2026-11-29T03:00:00Z'))).toBe(true); // Sun 10:00
    expect(isOpenAt({ ...hours, sat: [] }, at('2026-11-30T02:59:00Z'))).toBe(true); // Mon 09:59
    expect(isOpenAt({ ...hours, sat: [] }, at('2026-11-30T03:00:00Z'))).toBe(false); // Mon 10:00
  });
});

describe('foldText and compareCodePoints', () => {
  it('removes case, accents and đ, and collapses spaces', () => {
    expect(foldText('PHỐ  ĐI   Bộ')).toBe('pho di bo');
    expect(foldText('Đường Nguyễn Huệ')).toBe('duong nguyen hue');
  });

  it('compares code points, so an astral character sorts after U+FFFD', () => {
    const emoji = String.fromCodePoint(0x1f600); // two UTF-16 units, the first is 0xD83D
    const replacement = String.fromCodePoint(0xfffd); // one UTF-16 unit
    expect(compareCodePoints(emoji, replacement)).toBeGreaterThan(0);
    expect(compareCodePoints('ab', 'abc')).toBeLessThan(0);
    expect(compareCodePoints('abc', 'abc')).toBe(0);
  });
});

describe('parseInstant', () => {
  it.each([
    ['2026-11-28T14:00:00+07:00', at('2026-11-28T07:00:00Z')],
    ['2026-11-28T14:00+07:00', at('2026-11-28T07:00:00Z')],
    ['2026-11-28T07:00:00.250Z', at('2026-11-28T07:00:00.250Z')],
    ['2028-02-29T00:00:00Z', at('2028-02-29T00:00:00Z')],
  ])('reads %s', (raw, expected) => {
    expect(parseInstant(raw)).toBe(expected);
  });

  it.each([
    '2026-11-28T14:00:00',
    '2026-02-29T00:00:00Z',
    '2026-13-01T00:00:00Z',
    '2026-11-28T24:00:00Z',
    '2026-11-28T14:00:00+24:00',
    '2026-11-28 14:00:00Z',
  ])('refuses %s', (raw) => {
    expect(parseInstant(raw)).toBeNull();
  });
});

describe('parsePlacesQuery', () => {
  it('treats a name on Object.prototype as an unknown parameter', () => {
    const result = parsePlacesQuery(new URLSearchParams('constructor=x&__proto__=y'));
    expect(result).toEqual({
      ok: false,
      errors: [
        { parameter: 'constructor', detail: 'is not a parameter of this endpoint' },
        { parameter: '__proto__', detail: 'is not a parameter of this endpoint' },
      ],
    });
  });
});

describe('cursor', () => {
  const secret = 'unit-test-secret-0123456789abcdef';
  const payload: CursorPayload = { v: 1, f: 'abc', k: ['pho hoa', 'pho-hoa'], t: null, s: 1 };

  it('reads back what it wrote', () => {
    expect(decodeCursor(encodeCursor(payload, secret), secret)).toEqual(payload);
  });

  it('refuses another secret, a changed body and a changed last character', () => {
    const cursor = encodeCursor(payload, secret);
    const [body = '', signature = ''] = cursor.split('.');
    const last = signature.at(-1) === 'A' ? 'B' : 'A';
    expect(decodeCursor(cursor, `${secret}!`)).toBeNull();
    expect(decodeCursor(`${body}x.${signature}`, secret)).toBeNull();
    expect(decodeCursor(`${body}.${signature.slice(0, -1)}${last}`, secret)).toBeNull();
    expect(decodeCursor('no-dot', secret)).toBeNull();
  });
});
