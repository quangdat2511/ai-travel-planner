// docs/contract/get-places.md: section 3 (Place), 4.5 (filters), 4.6 (order).
import { describe, expect, it } from 'vitest';
import { getPlaces, makeTestApp } from '../support/app.js';
import { expectPage, ids } from '../support/contract.js';
import { CHECKED_IN_ORDER, INCOMPLETE_IN_ORDER, TOKENS } from '../support/fixtures.js';

describe('the page and the Place (3, 4.6)', () => {
  it('lists the checked places, in order of name without case or accents, then id', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app));
    expect(ids(page)).toEqual(CHECKED_IN_ORDER);
    expect(page.nextCursor).toBeNull();
    expect(page.items.every((item) => item.status === 'checked')).toBe(true);
  });

  it('returns every field of a Place, with money in integer dong', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'type=museum'));
    expect(page.items).toEqual([
      {
        id: 'bao-tang-mau',
        name: 'Bảo Tàng Mẫu',
        type: 'museum',
        district: 'quan-3',
        address: '1 Đường Thử, Bảo Tàng Mẫu',
        location: { lat: 10.7769, lng: 106.7009 },
        setting: 'indoor',
        priceLevel: 1,
        ticketPriceVnd: 40000,
        openingHours: {
          mon: [],
          tue: [{ open: '08:00', close: '17:00' }],
          wed: [{ open: '08:00', close: '17:00' }],
          thu: [{ open: '08:00', close: '17:00' }],
          fri: [{ open: '08:00', close: '17:00' }],
          sat: [{ open: '08:00', close: '17:00' }],
          sun: [{ open: '08:00', close: '17:00' }],
        },
        status: 'checked',
        photo: {
          url: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Test.jpg',
          credit: 'Photo: Test Author, CC BY-SA 4.0, via Wikimedia Commons',
        },
        source: {
          name: 'Museum website',
          url: 'https://example.org/bao-tang-mau',
          checkedOn: '2026-11-19',
        },
      },
    ]);
  });

  it('returns an empty page with a null cursor when no place matches', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'district=can-gio'));
    expect(page).toEqual({ items: [], nextCursor: null });
  });
});

describe('list filters: type, district, priceLevel (4.5)', () => {
  it('matches any value of a list', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'type=cafe,bar'));
    expect(ids(page)).toEqual(['ca-phe-den', 'ca-phe-den-2', 'quan-bar-dem']);
  });

  it('combines different parameters with AND', async () => {
    const { app } = makeTestApp();
    const page = expectPage(
      await getPlaces(app, 'type=food&district=quan-3,quan-1&priceLevel=2,4'),
    );
    expect(ids(page)).toEqual(['nha-hang-sang', 'pho-hoa-test']);
  });
});

describe('q (4.5)', () => {
  it.each([
    ['pho', ['pho-di-bo-mau', 'pho-hoa-test']],
    ['PHỞ', ['pho-di-bo-mau', 'pho-hoa-test']],
    ['đêm', ['cho-dem-vi-du', 'quan-bar-dem']],
    ['dem', ['cho-dem-vi-du', 'quan-bar-dem']],
    ['cho   dem', ['cho-dem-vi-du']],
    ['  ca phe  ', ['ca-phe-den', 'ca-phe-den-2']],
    ['zzz', []],
  ])('q=%j finds %j', async (q, expected) => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, `q=${encodeURIComponent(q)}`));
    expect(ids(page)).toEqual(expected);
  });
});

describe('openAt (4.5)', () => {
  it('lists the places open at an instant; open is inside, close is outside', async () => {
    const { app } = makeTestApp();
    // Saturday 14:00: Nhà Hàng Sang (11:00-14:00) and Phở Hòa (06:00-14:00) have just closed.
    const page = expectPage(await getPlaces(app, 'openAt=2026-11-28T14:00:00%2B07:00'));
    expect(ids(page)).toEqual([
      'banh-mi-anh',
      'bao-tang-mau',
      'ca-phe-den',
      'ca-phe-den-2',
      'cong-vien-xanh',
      'pho-di-bo-mau',
      'rap-phim-sao',
      'trung-tam-mua-sam',
    ]);
  });

  it('counts an overnight interval from the day before', async () => {
    const { app } = makeTestApp();
    // Saturday 00:30: Friday 17:00-01:00 and every day 19:00-02:00 are still open.
    const page = expectPage(await getPlaces(app, 'openAt=2026-11-28T00:30:00%2B07:00'));
    expect(ids(page)).toEqual(['cho-dem-vi-du', 'pho-di-bo-mau', 'quan-bar-dem']);
  });

  it('closes an overnight interval at its close time on the next day', async () => {
    const { app } = makeTestApp();
    // Sunday 01:30: the market's Saturday interval ended at 01:00, the bar's runs to 02:00.
    const page = expectPage(
      await getPlaces(app, 'openAt=2026-11-29T01:30:00%2B07:00&type=market,bar'),
    );
    expect(ids(page)).toEqual(['quan-bar-dem']);
  });

  it('reads the same instant the same way in any offset', async () => {
    const { app } = makeTestApp();
    const city = expectPage(await getPlaces(app, 'openAt=2026-11-28T00:30:00%2B07:00'));
    const utc = expectPage(await getPlaces(app, 'openAt=2026-11-27T17:30:00Z'));
    const other = expectPage(await getPlaces(app, 'openAt=2026-11-27T12:30:00-05:00'));
    expect(ids(utc)).toEqual(ids(city));
    expect(ids(other)).toEqual(ids(city));
  });

  it('treats a day with no interval as closed all day', async () => {
    const { app } = makeTestApp();
    // Monday 18:00: the market and the museum are closed on Mondays.
    const page = expectPage(
      await getPlaces(app, 'openAt=2026-11-30T18:00:00%2B07:00&type=market,museum'),
    );
    expect(ids(page)).toEqual([]);
  });

  it('uses the server clock for openAt=now', async () => {
    const { app } = makeTestApp();
    const now = expectPage(await getPlaces(app, 'openAt=now'));
    const explicit = expectPage(await getPlaces(app, 'openAt=2026-11-28T14:00:00%2B07:00'));
    expect(ids(now)).toEqual(ids(explicit));
  });

  it('never matches a place whose opening hours are unknown', async () => {
    const { app } = makeTestApp();
    const page = expectPage(
      await getPlaces(app, 'status=all&openAt=2026-11-28T12:00:00%2B07:00', TOKENS.admin),
    );
    expect(ids(page)).not.toContain('quan-moi-mo');
  });
});

describe('status (4.5)', () => {
  it('lists only incomplete places for status=incomplete', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'status=incomplete', TOKENS.admin));
    expect(ids(page)).toEqual(INCOMPLETE_IN_ORDER);
    expect(page.items.every((item) => item.status === 'incomplete')).toBe(true);
    expect(page.items.find((item) => item.id === 'quan-moi-mo')?.openingHours).toBeNull();
  });

  it('lists both for status=all, in one order', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'status=all', TOKENS.admin));
    expect(ids(page)).toEqual([
      ...CHECKED_IN_ORDER.slice(0, 10),
      'quan-chua-co-menu',
      'quan-moi-mo',
      ...CHECKED_IN_ORDER.slice(10),
    ]);
  });
});

describe('excludeVisited and groupId (4.5)', () => {
  it("leaves out the caller's own check-ins", async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'excludeVisited=true', TOKENS.linh));
    expect(ids(page)).toEqual(CHECKED_IN_ORDER.filter((id) => id !== 'banh-mi-anh'));
  });

  it('with groupId, leaves out the check-ins of every member', async () => {
    const { app } = makeTestApp();
    const page = expectPage(
      await getPlaces(app, 'excludeVisited=true&groupId=g-weekend', TOKENS.linh),
    );
    const visitedByGroup = ['banh-mi-anh', 'ca-phe-den', 'cong-vien-xanh'];
    expect(ids(page)).toEqual(CHECKED_IN_ORDER.filter((id) => !visitedByGroup.includes(id)));
  });

  it('with groupId, adds counts for the group to every place', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, 'groupId=g-weekend', TOKENS.an));
    const byId = new Map(page.items.map((item) => [item.id, item.group]));
    expect(page.items.every((item) => item.group?.memberCount === 4)).toBe(true);
    expect(byId.get('cho-dem-vi-du')).toEqual({
      memberCount: 4,
      wantToGoCount: 3,
      visitedCount: 0,
    });
    expect(byId.get('banh-mi-anh')).toEqual({ memberCount: 4, wantToGoCount: 1, visitedCount: 1 });
    expect(byId.get('rap-phim-sao')).toEqual({ memberCount: 4, wantToGoCount: 0, visitedCount: 0 });
  });

  it('has no group block without groupId', async () => {
    const { app } = makeTestApp();
    const page = expectPage(await getPlaces(app, '', TOKENS.linh));
    expect(page.items.some((item) => 'group' in item)).toBe(false);
  });
});
