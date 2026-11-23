// docs/contract/get-places.md, section 4.1: who may call it, and the ownership rules.
import { describe, expect, it } from 'vitest';
import { getPlaces, makeTestApp } from '../support/app.js';
import { expectPage, expectProblem, ids, varyHeaders } from '../support/contract.js';
import { CHECKED_IN_ORDER, TOKENS } from '../support/fixtures.js';

describe('who may call it (4.1)', () => {
  it('serves an anonymous caller, with no me block and a public cache header', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app);
    const page = expectPage(res);
    expect(page.items.some((item) => 'me' in item)).toBe(false);
    expect(res.headers['cache-control']).toBe('public, max-age=60');
    expect(varyHeaders(res)).toContain('authorization');
  });

  it.each([
    ['a traveler', TOKENS.linh],
    ['a business account', TOKENS.business],
    ['an admin', TOKENS.admin],
  ])('gives %s a me block on every place and a private cache header', async (_case, token) => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, '', token);
    const page = expectPage(res);
    expect(page.items.every((item) => item.me !== undefined)).toBe(true);
    expect(res.headers['cache-control']).toBe('private, no-store');
    expect(varyHeaders(res)).toContain('authorization');
  });

  it('shows a business account the same list, in the same order, as a traveler', async () => {
    const { app } = makeTestApp();
    const traveler = expectPage(await getPlaces(app, 'limit=50', TOKENS.linh));
    const business = expectPage(await getPlaces(app, 'limit=50', TOKENS.business));
    expect(ids(business)).toEqual(ids(traveler));
  });
});

describe('ownership rules (4.1)', () => {
  it("fills the me block from the caller's own data only", async () => {
    const { app } = makeTestApp();
    const linh = expectPage(await getPlaces(app, '', TOKENS.linh));
    const an = expectPage(await getPlaces(app, '', TOKENS.an));
    const meOf = (page: typeof linh, id: string) => page.items.find((item) => item.id === id)?.me;

    expect(meOf(linh, 'banh-mi-anh')).toEqual({ wantToGo: true, visited: true });
    expect(meOf(linh, 'ca-phe-den')).toEqual({ wantToGo: false, visited: false }); // An's check-in
    expect(meOf(an, 'ca-phe-den')).toEqual({ wantToGo: false, visited: true });
    expect(meOf(an, 'banh-mi-anh')).toEqual({ wantToGo: false, visited: false }); // Linh's
  });

  it("does not change the caller's response when another user checks in", async () => {
    const { app, userPlaces } = makeTestApp();
    const before = expectPage(await getPlaces(app, 'excludeVisited=true', TOKENS.linh));
    userPlaces.checkIn('u-an', 'rap-phim-sao');
    userPlaces.addWantToGo('u-an', 'rap-phim-sao');
    const after = expectPage(await getPlaces(app, 'excludeVisited=true', TOKENS.linh));
    expect(after).toEqual(before);
    expect(ids(after)).toContain('rap-phim-sao');
  });

  it('has no parameter that names another user', async () => {
    const { app } = makeTestApp();
    for (const query of ['userId=u-an', 'visitedBy=u-an', 'user=u-an']) {
      expectProblem(await getPlaces(app, query, TOKENS.linh), 'validation');
    }
  });

  it('gives a non-member the same 404 as a group that does not exist', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, 'groupId=g-weekend', TOKENS.business);
    const body = expectProblem(res, 'group-not-found');
    const missing = expectProblem(
      await getPlaces(app, 'groupId=g-missing', TOKENS.business),
      'group-not-found',
    );
    expect(body).toEqual(missing);
  });

  it('puts counts only in the group block, never a member id', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, 'groupId=g-weekend&limit=50', TOKENS.linh);
    const page = expectPage(res);
    expect(ids(page)).toEqual(CHECKED_IN_ORDER);
    for (const item of page.items) {
      expect(Object.keys(item.group ?? {}).sort()).toEqual([
        'memberCount',
        'visitedCount',
        'wantToGoCount',
      ]);
    }
    expect(res.text).not.toMatch(/u-linh|u-an|u-minh|u-khoa/);
  });
});
