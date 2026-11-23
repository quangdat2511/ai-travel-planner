// docs/contract/get-places.md, section 4.6: paging.
import type { Express } from 'express';
import { describe, expect, it } from 'vitest';
import { getPlaces, makeTestApp } from '../support/app.js';
import { expectPage, ids, type PageBody } from '../support/contract.js';
import { CHECKED_IN_ORDER, TOKENS, place } from '../support/fixtures.js';

const MINUTE = 60_000;

/** Follows nextCursor until it is null. `between` runs before each page after the first. */
async function walk(
  app: Express,
  query: string,
  options: { token?: string; between?: (pageIndex: number) => void } = {},
): Promise<PageBody[]> {
  const pages = [expectPage(await getPlaces(app, query, options.token))];
  for (let guard = 0; guard < 100; guard += 1) {
    const cursor = pages.at(-1)?.nextCursor;
    if (cursor === null || cursor === undefined) return pages;
    options.between?.(pages.length);
    const res = await getPlaces(
      app,
      `${query}&cursor=${encodeURIComponent(cursor)}`,
      options.token,
    );
    pages.push(expectPage(res));
  }
  throw new Error('The walk did not end after 100 pages');
}

describe('paging (4.6)', () => {
  it('walks every place exactly once, in order, and ends with a null cursor', async () => {
    const { app } = makeTestApp();
    const pages = await walk(app, 'limit=5');
    expect(pages.map((page) => page.items.length)).toEqual([5, 5, 2]);
    expect(pages.flatMap(ids)).toEqual(CHECKED_IN_ORDER);
    expect(pages.slice(0, -1).every((page) => typeof page.nextCursor === 'string')).toBe(true);
  });

  it('never gives a cursor that leads to an empty page', async () => {
    const { app } = makeTestApp();
    const pages = await walk(app, 'limit=4');
    expect(pages.map((page) => page.items.length)).toEqual([4, 4, 4]);
    expect(pages.at(-1)?.nextCursor).toBeNull();

    const single = expectPage(await getPlaces(app, 'limit=12'));
    expect(single.items).toHaveLength(12);
    expect(single.nextCursor).toBeNull();
  });

  it('uses a default limit of 20 and accepts a limit of 50', async () => {
    const { app, places } = makeTestApp();
    for (let index = 0; index < 50; index += 1) {
      places.put(place(`extra-${String(index).padStart(2, '0')}`, `Quán Thêm ${index}`));
    }
    const first = expectPage(await getPlaces(app));
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    expect(expectPage(await getPlaces(app, 'limit=50')).items).toHaveLength(50);
  });

  it('lets limit change from page to page', async () => {
    const { app } = makeTestApp();
    const first = expectPage(await getPlaces(app, 'limit=2'));
    const second = expectPage(await getPlaces(app, `limit=7&cursor=${first.nextCursor ?? ''}`));
    expect([...ids(first), ...ids(second)]).toEqual(CHECKED_IN_ORDER.slice(0, 9));
  });

  it('keeps the instant of the first page for openAt=now', async () => {
    const { app, clock } = makeTestApp();
    // Saturday 13:50. Nhà Hàng Sang and Phở Hòa close at 14:00, while the user scrolls.
    clock.set('2026-11-28T06:50:00Z');
    const expected = ids(expectPage(await getPlaces(app, 'openAt=2026-11-28T13:50:00%2B07:00')));
    expect(expected).toContain('nha-hang-sang');
    expect(expected).toContain('pho-hoa-test');

    const pages = await walk(app, 'openAt=now&limit=2', {
      between: () => {
        clock.advance(10 * MINUTE);
      },
    });
    expect(pages.flatMap(ids)).toEqual(expected);
  });

  it('does not move pages when places are added or removed during the walk', async () => {
    const { app, places } = makeTestApp();
    const pages = await walk(app, 'limit=3', {
      between: (pageIndex) => {
        if (pageIndex !== 1) return;
        places.put(place('an-moi', 'An Mới')); // sorts before the cursor
        places.put(place('xoi-moi', 'Xôi Mới')); // sorts after the cursor
        places.remove('quan-bar-dem'); // not reached yet
      },
    });
    const seen = pages.flatMap(ids);
    expect(new Set(seen).size).toBe(seen.length);
    const unchanged = CHECKED_IN_ORDER.filter((id) => id !== 'quan-bar-dem');
    expect(seen.filter((id) => unchanged.includes(id))).toEqual(unchanged);
    expect(seen).not.toContain('quan-bar-dem');
    expect(seen.filter((id) => id === 'xoi-moi').length).toBeLessThanOrEqual(1);
  });

  it('applies excludeVisited again on each page', async () => {
    const { app, userPlaces } = makeTestApp();
    const pages = await walk(app, 'excludeVisited=true&limit=4', {
      token: TOKENS.linh,
      between: (pageIndex) => {
        if (pageIndex === 1) userPlaces.checkIn('u-linh', 'trung-tam-mua-sam');
      },
    });
    const seen = pages.flatMap(ids);
    expect(seen).not.toContain('banh-mi-anh');
    expect(seen).not.toContain('trung-tam-mua-sam');
    expect(seen).toEqual(
      CHECKED_IN_ORDER.filter((id) => id !== 'banh-mi-anh' && id !== 'trung-tam-mua-sam'),
    );
  });

  it('gives no total count', async () => {
    const { app } = makeTestApp();
    const res = await getPlaces(app, 'limit=2');
    expect(Object.keys(res.body as object).sort()).toEqual(['items', 'nextCursor']);
  });
});
