import type { Express } from 'express';
import { createApp, type Logger } from '../../src/app.js';
import { InMemorySessionStore } from '../../src/auth/sessions.js';
import { InMemoryGroupRepository } from '../../src/groups/repository.js';
import { InMemoryPlaceRepository } from '../../src/places/repository.js';
import { InMemoryUserPlaceRepository } from '../../src/users/user-places.js';

export interface TestApp {
  app: Express;
  logged: unknown[];
}

// One app per test, with a logger that records instead of printing.
export function makeTestApp(): TestApp {
  const logged: unknown[] = [];
  const logger: Logger = {
    error: (_message, error) => {
      logged.push(error);
    },
  };
  const app = createApp({
    places: new InMemoryPlaceRepository(),
    groups: new InMemoryGroupRepository(),
    userPlaces: new InMemoryUserPlaceRepository(),
    sessions: new InMemorySessionStore(),
    cursorSecret: 'test-cursor-secret-'.padEnd(40, 'x'),
    logger,
  });
  return { app, logged };
}
