import type { Express } from 'express';
import { createApp, type Logger } from '../../src/app.js';

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
  return { app: createApp({ logger }), logged };
}
