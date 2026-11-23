// docs/contract/get-places.md: section 2 (errors), 4.3 (query parameters), 4.4 (order of checks).
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { PlaceRepository } from '../../src/places/repository.js';
import { getPlaces, makeTestApp } from '../support/app.js';
import { expectPage, expectProblem } from '../support/contract.js';
import { TOKENS } from '../support/fixtures.js';

const HOUR = 3_600_000;

async function firstCursor(query: string, token?: string) {
  const world = makeTestApp();
  const page = expectPage(await getPlaces(world.app, query, token));
  expect(page.nextCursor).not.toBeNull();
  if (page.nextCursor === null) throw new Error('expected a second page');
  return { ...world, cursor: page.nextCursor };
}

describe('400 validation: a filter that the server cannot read (4.3)', () => {
  it.each([
    ['an unknown parameter', 'distrct=quan-1', 'distrct'],
    ['a parameter name in another case', 'Type=food', 'Type'],
    ['bracket syntax', 'type[]=food', 'type[]'],
    ['a parameter that names another user', 'userId=u-an', 'userId'],
    ['a repeated parameter', 'type=food&type=cafe', 'type'],
    ['an empty value', 'type=', 'type'],
    ['a parameter without a value', 'excludeVisited', 'excludeVisited'],
    ['an empty item in a list', 'type=food,,cafe', 'type'],
    ['a repeated value in a list', 'type=food,food', 'type'],
    ['a type that is not in the list', 'type=spa', 'type'],
    ['a district that is not in the list', 'district=quan-2', 'district'],
    ['price level 0', 'priceLevel=0', 'priceLevel'],
    ['price level 5', 'priceLevel=5', 'priceLevel'],
    ['q with spaces only', 'q=%20%20%20', 'q'],
    ['q of 101 characters', `q=${'a'.repeat(101)}`, 'q'],
    ['openAt without an offset', 'openAt=2026-11-28T14:00:00', 'openAt'],
    ['openAt with a plain + (a space)', 'openAt=2026-11-28T14:00:00+07:00', 'openAt'],
    ['openAt that is not a date', 'openAt=tomorrow', 'openAt'],
    ['openAt on a day that does not exist', 'openAt=2026-02-30T10:00:00Z', 'openAt'],
    ['excludeVisited that is not a boolean', 'excludeVisited=yes', 'excludeVisited'],
    ['excludeVisited in capitals', 'excludeVisited=TRUE', 'excludeVisited'],
    ['a groupId with characters outside a-z 0-9 -', 'groupId=G_1', 'groupId'],
    ['an unknown status', 'status=closed', 'status'],
    ['limit 0', 'limit=0', 'limit'],
    ['limit 51, which is not clamped to 50', 'limit=51', 'limit'],
    ['limit with a leading zero', 'limit=05', 'limit'],
    ['limit that is not an integer', 'limit=2.5', 'limit'],
    ['a negative limit', 'limit=-1', 'limit'],
    ['a cursor of 1025 characters', `cursor=${'a'.repeat(1025)}`, 'cursor'],
  ])('refuses %s', async (_case, query, parameter) => {
    const { app } = makeTestApp();
    const body = expectProblem(await getPlaces(app, query), 'validation');
    expect(body.errors?.map((error) => error.parameter)).toEqual([parameter]);
  });

  it('lists every broken parameter once, in the order of the URL', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, 'limit=0&district=quan-1&distrct=x&type=spa&limit=3&q=ok');
    const body = expectProblem(res, 'validation');
    expect(body.errors?.map((error) => error.parameter)).toEqual(['limit', 'distrct', 'type']);
  });

  it('accepts every value at the edge of its rule', async () => {
    const { app } = makeTestApp();
    const query = [
      'type=food,cafe,bar,market,museum,landmark,park,entertainment,shopping',
      'district=quan-1,can-gio',
      'priceLevel=1,2,3,4',
      `q=${'a'.repeat(100)}`,
      'openAt=2026-11-28T14:00:00.000%2B07:00',
      'excludeVisited=false',
      'status=checked',
      'limit=50',
    ].join('&');
    expectPage(await getPlaces(app, query));
  });
});

describe('401 unauthenticated', () => {
  it.each([
    ['an unknown token', 'Bearer no-such-token'],
    ['an expired token', `Bearer ${TOKENS.expired}`],
    ['another scheme', 'Basic dXNlcjpwYXNz'],
    ['an empty bearer', 'Bearer '],
  ])('refuses %s, even with no parameter that needs sign-in', async (_case, header) => {
    const { app } = makeTestApp();
    const res = await request(app).get('/v1/places').set('Authorization', header);
    expectProblem(res, 'unauthenticated');
    expect(res.headers['www-authenticate']).toBe('Bearer');
  });

  it.each([['excludeVisited=true'], ['groupId=g-weekend'], ['status=incomplete'], ['status=all']])(
    'refuses %s from an anonymous caller',
    async (query) => {
      const { app } = makeTestApp();
      const res = await getPlaces(app, query);
      expectProblem(res, 'unauthenticated');
      expect(res.headers['www-authenticate']).toBe('Bearer');
    },
  );

  it('accepts the defaults excludeVisited=false and status=checked from an anonymous caller', async () => {
    const { app } = makeTestApp();
    expectPage(await getPlaces(app, 'excludeVisited=false&status=checked'));
  });
});

describe('403 forbidden', () => {
  it.each([
    ['a traveler', TOKENS.linh, 'status=incomplete'],
    ['a traveler', TOKENS.linh, 'status=all'],
    ['a business account', TOKENS.business, 'status=incomplete'],
  ])('refuses %s who asks for %s', async (_case, token, query) => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, query, token), 'forbidden');
  });

  it('lets an admin list incomplete places', async () => {
    const { app } = makeTestApp();
    expectPage(await getPlaces(app, 'status=incomplete', TOKENS.admin));
  });
});

describe('404 group-not-found', () => {
  it('refuses a group that does not exist', async () => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, 'groupId=g-nope', TOKENS.linh), 'group-not-found');
  });

  it('refuses a group of which the caller is not a member, with the same body', async () => {
    const { app } = makeTestApp();
    const notMember = expectProblem(
      await getPlaces(app, 'groupId=g-other', TOKENS.linh),
      'group-not-found',
    );
    const missing = expectProblem(
      await getPlaces(app, 'groupId=g-nope', TOKENS.linh),
      'group-not-found',
    );
    expect(notMember).toEqual(missing);
  });

  it('refuses an admin who is not a member', async () => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, 'groupId=g-weekend', TOKENS.admin), 'group-not-found');
  });
});

describe('400 invalid-cursor (4.6)', () => {
  it('refuses a cursor that the server did not make', async () => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, 'cursor=not-a-cursor'), 'invalid-cursor');
  });

  it('refuses a cursor with any one character changed', async () => {
    const { app, cursor } = await firstCursor('limit=2');
    for (const index of [0, Math.floor(cursor.length / 2), cursor.length - 1]) {
      const original = cursor.charAt(index);
      const changed =
        cursor.slice(0, index) + (original === 'A' ? 'B' : 'A') + cursor.slice(index + 1);
      const res = await getPlaces(app, `limit=2&cursor=${encodeURIComponent(changed)}`);
      expectProblem(res, 'invalid-cursor');
    }
  });

  it.each([
    ['another type', 'type=food&limit=1', 'type=cafe&limit=1'],
    ['one more type', 'type=food&limit=1', 'type=food,cafe&limit=1'],
    ['a filter left out', 'type=food&limit=1', 'limit=1'],
    ['another q', 'q=a&limit=1', 'q=b&limit=1'],
    [
      'openAt=now and the same instant written out',
      'openAt=now&limit=1',
      'openAt=2026-11-28T07:00:00Z&limit=1',
    ],
  ])('refuses a cursor sent with %s', async (_case, first, next) => {
    const { app, cursor } = await firstCursor(first);
    expectProblem(await getPlaces(app, `${next}&cursor=${cursor}`), 'invalid-cursor');
  });

  it.each([
    ['the list values in another order', 'type=food,cafe&limit=1', 'type=cafe,food&limit=1'],
    [
      'q in other case, accents and outer spaces',
      `q=pho&limit=1`,
      `q=${encodeURIComponent(' PHỞ ')}&limit=1`,
    ],
    ['another limit', 'limit=2', 'limit=5'],
    ['a default written out', 'limit=1', 'limit=1&excludeVisited=false&status=checked'],
  ])('accepts a cursor sent with %s', async (_case, first, next) => {
    const { app, cursor } = await firstCursor(first);
    expectPage(await getPlaces(app, `${next}&cursor=${cursor}`));
  });

  it('refuses a cursor more than 24 hours after the first page of its walk', async () => {
    const { app, clock, cursor } = await firstCursor('limit=2');
    clock.advance(23 * HOUR);
    const second = expectPage(await getPlaces(app, `limit=2&cursor=${cursor}`));
    expect(second.nextCursor).not.toBeNull();
    clock.advance(HOUR + 60_000);
    expectProblem(
      await getPlaces(app, `limit=2&cursor=${second.nextCursor ?? ''}`),
      'invalid-cursor',
    );
  });
});

describe('404 not-found and 405 method-not-allowed', () => {
  it('answers a path that does not exist with not-found', async () => {
    const { app } = makeTestApp();
    expectProblem(await request(app).get('/v1/place?limit=0'), 'not-found');
  });

  it.each(['post', 'put', 'patch', 'delete'] as const)(
    'answers %s /v1/places with 405 and Allow: GET, HEAD',
    async (method) => {
      const { app } = makeTestApp();
      const res = await request(app)[method]('/v1/places?limit=0');
      expectProblem(res, 'method-not-allowed');
      expect(res.headers.allow).toBe('GET, HEAD');
    },
  );

  it('answers HEAD like GET, without a body', async () => {
    const { app } = makeTestApp();
    const get = await getPlaces(app, 'limit=3');
    const head = await request(app).head('/v1/places?limit=3');
    expect(head.status).toBe(200);
    expect(head.headers['content-type']).toBe(get.headers['content-type']);
    expect(head.headers['cache-control']).toBe(get.headers['cache-control']);
    expect(head.text).toBeFalsy();
  });
});

describe('500 internal', () => {
  it('hides the cause and uses the fixed detail', async () => {
    const failing: PlaceRepository = {
      list: () =>
        Promise.reject(new Error('SQLITE_BUSY at /srv/app/db.sqlite: SELECT * FROM places')),
    };
    const { app, logged } = makeTestApp({ placeRepository: failing });
    const res = await getPlaces(app);
    const body = expectProblem(res, 'internal');
    expect(body.detail).toBe('Something went wrong on our side. Try again later.');
    expect(res.text).not.toMatch(/SQLITE|\/srv|SELECT|at .*\.ts/);
    expect(logged).toHaveLength(1);
  });
});

describe('4.4: the order of checks', () => {
  it('checks the path before anything else', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/v1/nope?limit=0').set('Authorization', 'Bearer bad');
    expectProblem(res, 'not-found');
  });

  it('checks the method before the token', async () => {
    const { app } = makeTestApp();
    const res = await request(app).post('/v1/places').set('Authorization', 'Bearer bad');
    expectProblem(res, 'method-not-allowed');
  });

  it('checks the token (2) before the parameters (3)', async () => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, 'limit=0', 'bad-token'), 'unauthenticated');
  });

  it('checks the parameters (3) before sign-in-only parameters (4)', async () => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, 'excludeVisited=true&limit=0'), 'validation');
  });

  it('checks sign-in (4) before the role (5)', async () => {
    const { app } = makeTestApp();
    expectProblem(await getPlaces(app, 'status=all'), 'unauthenticated');
  });

  it('checks the role (5) before the group (6)', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, 'status=all&groupId=g-other', TOKENS.linh);
    expectProblem(res, 'forbidden');
  });

  it('checks the group (6) before the cursor (7)', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, 'groupId=g-other&cursor=junk', TOKENS.linh);
    expectProblem(res, 'group-not-found');
  });
});
