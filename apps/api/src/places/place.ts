import { z } from 'zod';
import { DISTRICTS, ID_PATTERN, PLACE_TYPES, SETTINGS } from './catalog.js';

// A place as the backend stores it. The dataset loader checks every row against this schema.

const openTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'must be HH:MM from 00:00 to 23:59');
const closeTime = z
  .string()
  .regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/, 'must be HH:MM from 00:00 to 24:00');

export const intervalSchema = z.object({ open: openTime, close: closeTime });
export type Interval = z.infer<typeof intervalSchema>;

const dayHours = z.array(intervalSchema).max(4);

export const weeklyHoursSchema = z.object({
  mon: dayHours,
  tue: dayHours,
  wed: dayHours,
  thu: dayHours,
  fri: dayHours,
  sat: dayHours,
  sun: dayHours,
});
export type WeeklyHours = z.infer<typeof weeklyHoursSchema>;

export const placeRecordSchema = z.object({
  id: z.string().regex(ID_PATTERN),
  name: z.string().min(1).max(120),
  type: z.enum(PLACE_TYPES),
  district: z.enum(DISTRICTS),
  address: z.string().min(1).max(200),
  location: z.object({
    lat: z.number().min(10.3).max(11.2),
    lng: z.number().min(106.3).max(107.1),
  }),
  setting: z.enum(SETTINGS),
  priceLevel: z.int().min(1).max(4),
  ticketPriceVnd: z.int().min(0),
  openingHours: weeklyHoursSchema.nullable(),
  menuItemCount: z.int().min(0),
  photo: z.object({ url: z.url({ protocol: /^https$/ }), credit: z.string().min(1) }).nullable(),
  source: z.object({
    name: z.string().min(1).max(120),
    url: z.url().nullable(),
    checkedOn: z.iso.date(),
  }),
});
export type PlaceRecord = z.infer<typeof placeRecordSchema>;

export type PlaceStatus = 'checked' | 'incomplete';

// A place can be a stop in a schedule only with opening hours and a menu (brief, section 6).
export function placeStatus(place: PlaceRecord): PlaceStatus {
  return place.openingHours !== null && place.menuItemCount > 0 ? 'checked' : 'incomplete';
}
