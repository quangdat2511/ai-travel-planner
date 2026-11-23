// The response shapes of docs/contract/get-places.md, written from the contract
// and not imported from src/, so that a change in the code cannot change the test.
import type { Response } from 'supertest';
import { expect } from 'vitest';
import { z } from 'zod';

export const PROBLEM_BASE = 'https://ai-travel-planner.example/problems/';

export const PROBLEM_TABLE = {
  validation: { status: 400, title: 'Invalid request' },
  'invalid-cursor': { status: 400, title: 'Invalid cursor' },
  unauthenticated: { status: 401, title: 'Sign-in required' },
  forbidden: { status: 403, title: 'Not allowed' },
  'group-not-found': { status: 404, title: 'Group not found' },
  'not-found': { status: 404, title: 'Not found' },
  'method-not-allowed': { status: 405, title: 'Method not allowed' },
  internal: { status: 500, title: 'Internal error' },
} as const;

export type Slug = keyof typeof PROBLEM_TABLE;

const DISTRICTS = [
  'quan-1',
  'quan-3',
  'quan-4',
  'quan-5',
  'quan-6',
  'quan-7',
  'quan-8',
  'quan-10',
  'quan-11',
  'quan-12',
  'binh-thanh',
  'phu-nhuan',
  'go-vap',
  'tan-binh',
  'tan-phu',
  'binh-tan',
  'thu-duc',
  'binh-chanh',
  'hoc-mon',
  'cu-chi',
  'nha-be',
  'can-gio',
] as const;

const TYPES = [
  'food',
  'cafe',
  'bar',
  'market',
  'museum',
  'landmark',
  'park',
  'entertainment',
  'shopping',
] as const;

const interval = z.strictObject({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/),
});
const day = z.array(interval).max(4);

export const placeSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{1,64}$/),
  name: z.string().min(1).max(120),
  type: z.enum(TYPES),
  district: z.enum(DISTRICTS),
  address: z.string().min(1).max(200),
  location: z.strictObject({
    lat: z.number().min(10.3).max(11.2),
    lng: z.number().min(106.3).max(107.1),
  }),
  setting: z.enum(['indoor', 'outdoor']),
  priceLevel: z.int().min(1).max(4),
  ticketPriceVnd: z.int().min(0),
  openingHours: z
    .strictObject({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day })
    .nullable(),
  status: z.enum(['checked', 'incomplete']),
  photo: z
    .strictObject({ url: z.url({ protocol: /^https$/ }), credit: z.string().min(1) })
    .nullable(),
  source: z.strictObject({
    name: z.string().min(1).max(120),
    url: z.url().nullable(),
    checkedOn: z.iso.date(),
  }),
  me: z.strictObject({ wantToGo: z.boolean(), visited: z.boolean() }).optional(),
  group: z
    .strictObject({
      memberCount: z.int().min(1),
      wantToGoCount: z.int().min(0),
      visitedCount: z.int().min(0),
    })
    .optional(),
});

export type PlaceBody = z.infer<typeof placeSchema>;

export const pageSchema = z.strictObject({
  items: z.array(placeSchema),
  nextCursor: z.string().min(1).max(1024).nullable(),
});

export type PageBody = z.infer<typeof pageSchema>;

const problemSchema = z.strictObject({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().min(1),
  errors: z
    .array(z.strictObject({ parameter: z.string(), detail: z.string().min(1) }))
    .min(1)
    .optional(),
});

export type ProblemBody = z.infer<typeof problemSchema>;

/** Checks a 200 page against sections 3 and 4.6 and returns the parsed body. */
export function expectPage(res: Response): PageBody {
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  expect(res.headers['content-type']).toMatch(/^application\/json/);
  const parsed = pageSchema.safeParse(res.body);
  expect(parsed.error?.issues ?? [], 'page shape').toEqual([]);
  if (!parsed.success) throw parsed.error;
  const page = parsed.data;
  for (const item of page.items) {
    if (item.group !== undefined) {
      expect(item.group.wantToGoCount).toBeLessThanOrEqual(item.group.memberCount);
      expect(item.group.visitedCount).toBeLessThanOrEqual(item.group.memberCount);
    }
  }
  return page;
}

/** Checks a problem details response against section 2 and returns the body. */
export function expectProblem(res: Response, slug: Slug): ProblemBody {
  const { status, title } = PROBLEM_TABLE[slug];
  expect(res.status, JSON.stringify(res.body)).toBe(status);
  expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
  expect(res.headers['cache-control']).toBe('no-store');
  const parsed = problemSchema.safeParse(res.body);
  expect(parsed.error?.issues ?? [], 'problem shape').toEqual([]);
  if (!parsed.success) throw parsed.error;
  const body = parsed.data;
  expect(body.type).toBe(PROBLEM_BASE + slug);
  expect(body.title).toBe(title);
  expect(body.status).toBe(status);
  if (slug === 'validation') expect(body.errors).toBeDefined();
  else expect(body).not.toHaveProperty('errors');
  return body;
}

export function ids(page: PageBody): string[] {
  return page.items.map((item) => item.id);
}

export function varyHeaders(res: Response): string[] {
  const vary = res.headers.vary;
  return typeof vary === 'string' ? vary.split(',').map((name) => name.trim().toLowerCase()) : [];
}
