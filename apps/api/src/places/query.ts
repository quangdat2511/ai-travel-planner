import type { ParameterError } from '../http/problem.js';
import { DISTRICTS, type District, ID_PATTERN, PLACE_TYPES, type PlaceType } from './catalog.js';
import { foldText } from './text.js';

// The query parameters of contract section 4.3.

export type StatusFilter = 'checked' | 'incomplete' | 'all';
export type OpenAt = { kind: 'now' } | { kind: 'instant'; ms: number };

export interface PlacesQuery {
  types: PlaceType[] | null;
  districts: District[] | null;
  priceLevels: number[] | null;
  /** Folded text (see foldText), or null for no text filter. */
  q: string | null;
  openAt: OpenAt | null;
  excludeVisited: boolean;
  groupId: string | null;
  status: StatusFilter;
  limit: number;
  cursor: string | null;
}

export type ParseResult =
  { ok: true; query: PlacesQuery } | { ok: false; errors: ParameterError[] };

export const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;
const MAX_CURSOR_LENGTH = 1024;
const MAX_Q_LENGTH = 100;
const PRICE_LEVELS = ['1', '2', '3', '4'] as const;
const STATUSES = ['checked', 'incomplete', 'all'] as const;

/** Each parser stores the value in the query and returns nothing, or returns the broken rule. */
type Parser = (raw: string, query: PlacesQuery) => string | undefined;

// A Map, not an object: `?constructor=x` must be an unknown parameter, not Object.prototype.
const PARSERS = new Map<string, Parser>([
  [
    'type',
    (raw, query) =>
      parseList(raw, PLACE_TYPES, 'the type list', (values) => {
        query.types = values;
      }),
  ],
  [
    'district',
    (raw, query) =>
      parseList(raw, DISTRICTS, 'the district list', (values) => {
        query.districts = values;
      }),
  ],
  [
    'priceLevel',
    (raw, query) =>
      parseList(raw, PRICE_LEVELS, 'the integers 1 to 4', (values) => {
        query.priceLevels = values.map(Number);
      }),
  ],
  [
    'q',
    (raw, query) => {
      const trimmed = raw.trim();
      const length = Array.from(trimmed).length; // code points, as the contract counts
      if (length < 1 || length > MAX_Q_LENGTH) {
        return `must have 1 to ${MAX_Q_LENGTH} characters after the spaces at both ends are removed`;
      }
      query.q = foldText(trimmed);
      return undefined;
    },
  ],
  [
    'openAt',
    (raw, query) => {
      if (raw === 'now') {
        query.openAt = { kind: 'now' };
        return undefined;
      }
      const ms = parseInstant(raw);
      if (ms === null) {
        return 'must be now, or a date-time with an offset such as 2026-11-28T14:00:00+07:00 (send + as %2B)';
      }
      query.openAt = { kind: 'instant', ms };
      return undefined;
    },
  ],
  [
    'excludeVisited',
    (raw, query) => {
      if (raw !== 'true' && raw !== 'false') return 'must be true or false';
      query.excludeVisited = raw === 'true';
      return undefined;
    },
  ],
  [
    'groupId',
    (raw, query) => {
      if (!ID_PATTERN.test(raw)) return 'must be an id of 1 to 64 characters from a-z, 0-9 and -';
      query.groupId = raw;
      return undefined;
    },
  ],
  [
    'status',
    (raw, query) => {
      const status = STATUSES.find((value) => value === raw);
      if (status === undefined) return 'must be checked, incomplete or all';
      query.status = status;
      return undefined;
    },
  ],
  [
    'limit',
    (raw, query) => {
      // A client that asks for too many places gets the most we serve, not an error.
      const value = /^[1-9]\d*$/.test(raw) ? Number(raw) : NaN;
      if (Number.isNaN(value)) return `must be an integer from 1 to ${MAX_LIMIT}`;
      query.limit = Math.min(value, MAX_LIMIT);
      return undefined;
    },
  ],
  [
    'cursor',
    (raw, query) => {
      if (raw.length > MAX_CURSOR_LENGTH) {
        return `must be a nextCursor value of 1 to ${MAX_CURSOR_LENGTH} characters`;
      }
      query.cursor = raw;
      return undefined;
    },
  ],
]);

export function parsePlacesQuery(search: URLSearchParams): ParseResult {
  const query: PlacesQuery = {
    types: null,
    districts: null,
    priceLevels: null,
    q: null,
    openAt: null,
    excludeVisited: false,
    groupId: null,
    status: 'checked',
    limit: DEFAULT_LIMIT,
    cursor: null,
  };

  // Values per name, in the order the names first appear in the URL.
  const byName = new Map<string, string[]>();
  for (const [name, value] of search) {
    const values = byName.get(name);
    if (values === undefined) byName.set(name, [value]);
    else values.push(value);
  }

  const errors: ParameterError[] = [];
  for (const [parameter, values] of byName) {
    const parser = PARSERS.get(parameter);
    const [value] = values;
    let detail: string | undefined;
    if (parser === undefined) detail = 'is not a parameter of this endpoint';
    else if (values.length > 1) detail = 'must appear at most once; send one list, such as a,b';
    else if (value === undefined || value === '') detail = 'must not be empty';
    else detail = parser(value, query);
    if (detail !== undefined) errors.push({ parameter, detail });
  }

  return errors.length === 0 ? { ok: true, query } : { ok: false, errors };
}

function parseList<T extends string>(
  raw: string,
  allowed: readonly T[],
  label: string,
  store: (values: T[]) => void,
): string | undefined {
  const parts = raw.split(',');
  if (parts.some((part) => part === '')) return 'must not have an empty item in the list';
  const values = parts.map((part) => allowed.find((value) => value === part));
  if (values.some((value) => value === undefined)) {
    return `must hold only values from ${label}: ${allowed.join(', ')}`;
  }
  if (new Set(parts).size !== parts.length) return 'must not repeat a value';
  store(values as T[]);
  return undefined;
}

const INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?(?:Z|([+-])(\d{2}):(\d{2}))$/;

/** An RFC 3339 date-time with an offset, as milliseconds since the epoch, or null. */
export function parseInstant(raw: string): number | null {
  const match = INSTANT.exec(raw);
  if (match === null) return null;
  const [, y, mo, d, h, mi, s = '0', fraction = '', sign, oh = '0', om = '0'] = match;
  const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  const offsetHours = Number(oh);
  const offsetMinutes = Number(om);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;
  if (hour > 23 || minute > 59 || second > 59 || offsetHours > 23 || offsetMinutes > 59) {
    return null;
  }
  const millis = Number(fraction.padEnd(3, '0').slice(0, 3));
  const offsetMs = (sign === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes) * 60_000;
  return Date.UTC(year, month - 1, day, hour, minute, second, millis) - offsetMs;
}

/** The filters that a cursor belongs to. A left-out parameter counts as its default. */
export function filterKey(query: PlacesQuery): string {
  const sorted = <T>(values: T[] | null) => (values === null ? null : [...values].sort());
  return JSON.stringify([
    sorted(query.types),
    sorted(query.districts),
    sorted(query.priceLevels),
    query.q,
    query.openAt === null ? null : query.openAt.kind === 'now' ? 'now' : query.openAt.ms,
    query.excludeVisited,
    query.groupId,
    query.status,
  ]);
}
