import type { Express } from 'express';
import request from 'supertest';
import { createApp, type Logger } from '../../src/app.js';
import { InMemorySessionStore } from '../../src/auth/sessions.js';
import { InMemoryGroupRepository } from '../../src/groups/repository.js';
import { InMemoryPlaceRepository, type PlaceRepository } from '../../src/places/repository.js';
import { InMemoryUserPlaceRepository } from '../../src/users/user-places.js';
import { CHECK_INS, DEFAULT_NOW, GROUPS, PLACES, SESSIONS, WANT_TO_GO } from './fixtures.js';

export interface Clock {
  now: () => Date;
  set: (iso: string) => void;
  advance: (ms: number) => void;
}

export interface TestApp {
  app: Express;
  clock: Clock;
  places: InMemoryPlaceRepository;
  userPlaces: InMemoryUserPlaceRepository;
  logged: unknown[];
}

export interface TestAppOptions {
  /** Replaces the fixture places, for example with a repository that throws. */
  placeRepository?: PlaceRepository;
}

// One app per test: the fixture world, a clock the test controls, and a logger
// that records instead of printing.
export function makeTestApp(options: TestAppOptions = {}): TestApp {
  let current = new Date(DEFAULT_NOW).getTime();
  const clock: Clock = {
    now: () => new Date(current),
    set: (iso) => {
      current = new Date(iso).getTime();
    },
    advance: (ms) => {
      current += ms;
    },
  };

  const places = new InMemoryPlaceRepository(PLACES);
  const userPlaces = new InMemoryUserPlaceRepository();
  for (const [userId, placeId] of CHECK_INS) userPlaces.checkIn(userId, placeId);
  for (const [userId, placeId] of WANT_TO_GO) userPlaces.addWantToGo(userId, placeId);

  const logged: unknown[] = [];
  const logger: Logger = {
    error: (_message, error) => {
      logged.push(error);
    },
  };

  const app = createApp({
    places: options.placeRepository ?? places,
    groups: new InMemoryGroupRepository(GROUPS),
    userPlaces,
    sessions: new InMemorySessionStore(SESSIONS),
    cursorSecret: 'contract-test-cursor-secret-0123456789abcdef',
    now: clock.now,
    logger,
  });
  return { app, clock, places, userPlaces, logged };
}

/** GET /v1/places with a raw query string, as a stranger's client would send it. */
export function getPlaces(app: Express, query = '', token?: string): request.Test {
  const req = request(app).get(query === '' ? '/v1/places' : `/v1/places?${query}`);
  return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
}
