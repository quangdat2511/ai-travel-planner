// The value lists of docs/contract/get-places.md, section 3.

export const PLACE_TYPES = [
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
export type PlaceType = (typeof PLACE_TYPES)[number];

// The 22 districts before 1 July 2025. The class dataset still uses them.
export const DISTRICTS = [
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
export type District = (typeof DISTRICTS)[number];

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const SETTINGS = ['indoor', 'outdoor'] as const;
export type Setting = (typeof SETTINGS)[number];

export const ID_PATTERN = /^[a-z0-9-]{1,64}$/;
