import express, { type ErrorRequestHandler, type Express } from 'express';
import type { SessionStore } from './auth/sessions.js';
import type { GroupRepository } from './groups/repository.js';
import { INTERNAL_DETAIL, sendProblem } from './http/problem.js';
import type { PlaceRepository } from './places/repository.js';
import type { UserPlaceRepository } from './users/user-places.js';

export interface Logger {
  error(message: string, error: unknown): void;
}

export interface AppDeps {
  places: PlaceRepository;
  groups: GroupRepository;
  userPlaces: UserPlaceRepository;
  sessions: SessionStore;
  /** Signs paging cursors. At least 32 characters. */
  cursorSecret: string;
  now?: () => Date;
  logger?: Logger;
}

export function createApp(deps: AppDeps): Express {
  const logger = deps.logger ?? console;
  const app = express();
  app.disable('x-powered-by');
  // Each route reads its own query string with URLSearchParams, so that
  // `type[]=x` or `a[b]=c` never turns into an array or an object.
  app.set('query parser', false);

  const v1 = express.Router();
  app.use('/v1', v1);

  app.use((_req, res) => {
    sendProblem(res, 'not-found', 'There is no such path under /v1.');
  });

  const onError: ErrorRequestHandler = (error, _req, res, _next) => {
    logger.error('Unhandled error', error);
    sendProblem(res, 'internal', INTERNAL_DETAIL);
  };
  app.use(onError);

  return app;
}
