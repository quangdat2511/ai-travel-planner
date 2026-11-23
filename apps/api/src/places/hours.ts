import { WEEKDAYS } from './catalog.js';
import type { Interval, WeeklyHours } from './place.js';

// Ho Chi Minh City is UTC+7 all year, with no daylight saving time.
const CITY_OFFSET_MS = 7 * 3_600_000;

export interface CityClock {
  /** 0 is Monday, 6 is Sunday. */
  dayIndex: number;
  /** Minutes since 00:00, city time. */
  minute: number;
}

export function cityClock(instantMs: number): CityClock {
  const shifted = new Date(instantMs + CITY_OFFSET_MS);
  return {
    dayIndex: (shifted.getUTCDay() + 6) % 7,
    minute: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function minutes(time: string): number {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
}

/** An interval whose close is not later than its open ends on the next day. */
function isOvernight(interval: Interval): boolean {
  return minutes(interval.close) <= minutes(interval.open);
}

/** `open` is inside the interval, `close` is outside (contract, section 3). */
export function isOpenAt(hours: WeeklyHours, instantMs: number): boolean {
  const { dayIndex, minute } = cityClock(instantMs);
  const today = hours[WEEKDAYS[dayIndex] ?? 'mon'];
  const yesterday = hours[WEEKDAYS[(dayIndex + 6) % 7] ?? 'sun'];

  const openToday = today.some((interval) =>
    isOvernight(interval)
      ? minute >= minutes(interval.open)
      : minute >= minutes(interval.open) && minute < minutes(interval.close),
  );
  const openFromYesterday = yesterday.some(
    (interval) => isOvernight(interval) && minute < minutes(interval.close),
  );
  return openToday || openFromYesterday;
}
