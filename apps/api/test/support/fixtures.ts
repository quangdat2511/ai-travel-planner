import type { Session } from '../../src/auth/sessions.js';
import type { PlaceRecord, WeeklyHours } from '../../src/places/place.js';

// A small, fictional world for the contract tests. Names carry Vietnamese accents
// on purpose: `q` and the order must ignore them.

export function sameEveryDay(day: WeeklyHours['mon']): WeeklyHours {
  return { mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day };
}

export function everyDay(open: string, close: string): WeeklyHours {
  return sameEveryDay([{ open, close }]);
}

export function place(id: string, name: string, overrides: Partial<PlaceRecord> = {}): PlaceRecord {
  return {
    id,
    name,
    type: 'food',
    district: 'quan-1',
    address: `1 Đường Thử, ${name}`,
    location: { lat: 10.7769, lng: 106.7009 },
    setting: 'indoor',
    priceLevel: 1,
    ticketPriceVnd: 0,
    openingHours: everyDay('08:00', '20:00'),
    menuItemCount: 4,
    photo: null,
    source: { name: 'Contract test fixture', url: null, checkedOn: '2026-11-20' },
    ...overrides,
  };
}

export const PLACES: PlaceRecord[] = [
  place('trung-tam-mua-sam', 'Trung Tâm Mua Sắm', {
    type: 'shopping',
    district: 'quan-7',
    priceLevel: 3,
    openingHours: everyDay('10:00', '22:00'),
  }),
  place('banh-mi-anh', 'Bánh Mì Ánh', { openingHours: everyDay('06:00', '21:00') }),
  place('bao-tang-mau', 'Bảo Tàng Mẫu', {
    type: 'museum',
    district: 'quan-3',
    ticketPriceVnd: 40000,
    openingHours: { ...everyDay('08:00', '17:00'), mon: [] },
    photo: {
      url: 'https://upload.wikimedia.org/wikipedia/commons/0/00/Test.jpg',
      credit: 'Photo: Test Author, CC BY-SA 4.0, via Wikimedia Commons',
    },
    source: {
      name: 'Museum website',
      url: 'https://example.org/bao-tang-mau',
      checkedOn: '2026-11-19',
    },
  }),
  place('ca-phe-den-2', 'Cà Phê Đen', {
    type: 'cafe',
    district: 'quan-3',
    openingHours: everyDay('07:00', '22:00'),
  }),
  place('ca-phe-den', 'Cà Phê Đen', { type: 'cafe', openingHours: everyDay('07:00', '22:00') }),
  place('cho-dem-vi-du', 'Chợ Đêm Ví Dụ', {
    type: 'market',
    setting: 'outdoor',
    priceLevel: 2,
    openingHours: {
      mon: [],
      tue: [{ open: '17:00', close: '23:00' }],
      wed: [{ open: '17:00', close: '23:00' }],
      thu: [{ open: '17:00', close: '23:00' }],
      fri: [{ open: '17:00', close: '01:00' }],
      sat: [
        { open: '09:00', close: '11:30' },
        { open: '17:00', close: '01:00' },
      ],
      sun: [{ open: '17:00', close: '23:00' }],
    },
  }),
  place('cong-vien-xanh', 'Công Viên Xanh', {
    type: 'park',
    district: 'quan-3',
    setting: 'outdoor',
    openingHours: everyDay('05:00', '22:00'),
  }),
  place('nha-hang-sang', 'Nhà Hàng Sang', {
    priceLevel: 4,
    openingHours: sameEveryDay([
      { open: '11:00', close: '14:00' },
      { open: '17:00', close: '22:00' },
    ]),
  }),
  place('pho-di-bo-mau', 'PHỐ ĐI BỘ MẪU', {
    type: 'landmark',
    setting: 'outdoor',
    openingHours: everyDay('00:00', '24:00'),
  }),
  place('pho-hoa-test', 'Phở Hòa Test', {
    district: 'quan-3',
    priceLevel: 2,
    openingHours: everyDay('06:00', '14:00'),
  }),
  place('quan-bar-dem', 'Quán Bar Đêm', {
    type: 'bar',
    district: 'binh-thanh',
    priceLevel: 3,
    openingHours: everyDay('19:00', '02:00'),
  }),
  place('rap-phim-sao', 'Rạp Phim Sao', {
    type: 'entertainment',
    district: 'phu-nhuan',
    priceLevel: 2,
    openingHours: everyDay('09:00', '23:30'),
  }),
  place('quan-moi-mo', 'Quán Mới Mở', { district: 'quan-10', openingHours: null }),
  place('quan-chua-co-menu', 'Quán Chưa Có Menu', {
    type: 'cafe',
    district: 'quan-5',
    menuItemCount: 0,
  }),
];

// The checked places in contract order: name without case or accents, then id.
export const CHECKED_IN_ORDER = [
  'banh-mi-anh',
  'bao-tang-mau',
  'ca-phe-den',
  'ca-phe-den-2',
  'cho-dem-vi-du',
  'cong-vien-xanh',
  'nha-hang-sang',
  'pho-di-bo-mau',
  'pho-hoa-test',
  'quan-bar-dem',
  'rap-phim-sao',
  'trung-tam-mua-sam',
];

export const INCOMPLETE_IN_ORDER = ['quan-chua-co-menu', 'quan-moi-mo'];

const FAR_FUTURE = new Date('2027-12-31T00:00:00Z');

export const TOKENS = {
  linh: 'tok-linh',
  an: 'tok-an',
  business: 'tok-business',
  admin: 'tok-admin',
  expired: 'tok-expired',
} as const;

export const SESSIONS: Record<string, Session> = {
  [TOKENS.linh]: { userId: 'u-linh', role: 'traveler', expiresAt: FAR_FUTURE },
  [TOKENS.an]: { userId: 'u-an', role: 'traveler', expiresAt: FAR_FUTURE },
  [TOKENS.business]: { userId: 'u-biz', role: 'business', expiresAt: FAR_FUTURE },
  [TOKENS.admin]: { userId: 'u-admin', role: 'admin', expiresAt: FAR_FUTURE },
  [TOKENS.expired]: {
    userId: 'u-old',
    role: 'traveler',
    expiresAt: new Date('2026-11-01T00:00:00Z'),
  },
};

// Linh's weekend group has four members. u-minh and u-khoa have no session in the tests.
export const GROUPS: Record<string, string[]> = {
  'g-weekend': ['u-linh', 'u-an', 'u-minh', 'u-khoa'],
  'g-other': ['u-biz'],
};

export const CHECK_INS: [userId: string, placeId: string][] = [
  ['u-linh', 'banh-mi-anh'],
  ['u-an', 'ca-phe-den'],
  ['u-minh', 'cong-vien-xanh'],
];

export const WANT_TO_GO: [userId: string, placeId: string][] = [
  ['u-linh', 'cho-dem-vi-du'],
  ['u-linh', 'banh-mi-anh'],
  ['u-an', 'cho-dem-vi-du'],
  ['u-khoa', 'cho-dem-vi-du'],
  ['u-minh', 'pho-hoa-test'],
];

// Saturday 28 Nov 2026, 14:00 in Ho Chi Minh City.
export const DEFAULT_NOW = '2026-11-28T07:00:00Z';
