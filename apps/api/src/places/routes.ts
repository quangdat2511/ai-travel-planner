import express, { type Request, type Response, type Router } from 'express';
import type { Session, SessionStore } from '../auth/sessions.js';
import type { GroupRepository } from '../groups/repository.js';
import { sendProblem } from '../http/problem.js';
import type { UserPlaceRepository } from '../users/user-places.js';
import { decodeCursor, encodeCursor, hashFilters } from './cursor.js';
import { isOpenAt } from './hours.js';
import { type PlaceRecord, type PlaceStatus, placeStatus } from './place.js';
import { filterKey, parsePlacesQuery, type PlacesQuery } from './query.js';
import type { PlaceRepository } from './repository.js';
import { compareCodePoints, foldText } from './text.js';

// GET /v1/places, as docs/contract/get-places.md specifies it.

export interface PlacesRouteDeps {
  places: PlaceRepository;
  groups: GroupRepository;
  userPlaces: UserPlaceRepository;
  sessions: SessionStore;
  cursorSecret: string;
  now: () => Date;
}

const CURSOR_LIFETIME_MS = 24 * 3_600_000;
const BEARER = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/;

type PlaceView = Omit<PlaceRecord, 'menuItemCount'> & {
  status: PlaceStatus;
  me?: { wantToGo: boolean; visited: boolean };
  group?: { memberCount: number; wantToGoCount: number; visitedCount: number };
};

interface Ranked {
  place: PlaceRecord;
  key: string;
}

export function placesRouter(deps: PlacesRouteDeps): Router {
  const router = express.Router();
  router
    .route('/places')
    .get((req, res) => listPlaces(deps, req, res))
    .all((_req, res) => {
      res.set('Allow', 'GET, HEAD');
      sendProblem(res, 'method-not-allowed', 'Use GET or HEAD on /v1/places.');
    });
  return router;
}

async function listPlaces(deps: PlacesRouteDeps, req: Request, res: Response): Promise<void> {
  const now = deps.now().getTime();

  // Step 2: a token that is present must be valid.
  const caller = await authenticate(req.get('Authorization'), deps.sessions, now);
  if (caller === 'invalid') {
    sendProblem(res, 'unauthenticated', 'The session token is not valid, or it has expired.');
    return;
  }

  // Step 3: every query parameter follows section 4.3.
  const parsed = parsePlacesQuery(new URL(req.originalUrl, 'http://localhost').searchParams);
  if (!parsed.ok) {
    const count = parsed.errors.length;
    const detail = `${count} query parameter${count === 1 ? ' is' : 's are'} invalid.`;
    sendProblem(res, 'validation', detail, parsed.errors);
    return;
  }
  const query = parsed.query;

  // Step 4: some parameters need a signed-in caller.
  if (caller === null) {
    const needsSignIn = [
      query.excludeVisited ? 'excludeVisited=true' : null,
      query.groupId !== null ? 'groupId' : null,
      query.status !== 'checked' ? `status=${query.status}` : null,
    ].filter((name) => name !== null);
    if (needsSignIn.length > 0) {
      sendProblem(res, 'unauthenticated', `${needsSignIn.join(' and ')} needs a signed-in caller.`);
      return;
    }
  }

  // Step 5: only an admin sees incomplete places.
  if (caller !== null && query.status !== 'checked' && caller.role !== 'admin') {
    sendProblem(res, 'forbidden', 'Only an admin can list places with status incomplete or all.');
    return;
  }

  // Step 6: only a member can use a group. A non-member gets the same answer as a missing group.
  let memberIds: readonly string[] | null = null;
  if (caller !== null && query.groupId !== null) {
    memberIds = await deps.groups.memberIds(query.groupId);
    if (memberIds?.includes(caller.userId) !== true) {
      sendProblem(
        res,
        'group-not-found',
        'There is no group with this id that you are a member of.',
      );
      return;
    }
  }

  // Step 7: the cursor.
  const filters = hashFilters(filterKey(query));
  let walkStart = now;
  let after: [string, string] | null = null;
  let openAtMs = query.openAt === null ? null : query.openAt.kind === 'now' ? now : query.openAt.ms;
  if (query.cursor !== null) {
    const payload = decodeCursor(query.cursor, deps.cursorSecret);
    let problem: string | null = null;
    if (payload === null) problem = 'The cursor was not made by this server, or it was changed.';
    else if (payload.f !== filters) problem = 'The cursor belongs to other filters.';
    else if (now - payload.s > CURSOR_LIFETIME_MS)
      problem = 'The cursor is more than 24 hours old.';
    if (payload === null || problem !== null) {
      sendProblem(res, 'invalid-cursor', `${problem ?? ''} Load the first page again.`);
      return;
    }
    walkStart = payload.s;
    after = payload.k;
    if (query.openAt?.kind === 'now') openAtMs = payload.t;
  }

  // Step 8: one page.
  const [all, excluded] = await Promise.all([
    deps.places.list(),
    query.excludeVisited && caller !== null
      ? visitedByAny(deps.userPlaces, memberIds ?? [caller.userId])
      : Promise.resolve(new Set<string>()),
  ]);

  const ranked: Ranked[] = all
    .filter((place) => matches(place, query, openAtMs) && !excluded.has(place.id))
    .map((place) => ({ place, key: foldText(place.name) }))
    .sort(compareRanked);
  const rest = after === null ? ranked : ranked.filter((item) => compareKey(item, after) > 0);
  const page = rest.slice(0, query.limit);
  const last = page.at(-1);
  const nextCursor =
    rest.length > query.limit && last !== undefined
      ? encodeCursor(
          {
            v: 1,
            f: filters,
            k: [last.key, last.place.id],
            t: query.openAt?.kind === 'now' ? openAtMs : null,
            s: walkStart,
          },
          deps.cursorSecret,
        )
      : null;

  const items = await toViews(
    page.map((item) => item.place),
    caller,
    memberIds,
    deps.userPlaces,
  );
  res.set('Cache-Control', caller === null ? 'public, max-age=60' : 'private, no-store');
  res.set('Vary', 'Authorization');
  res.json({ items, nextCursor });
}

async function authenticate(
  header: string | undefined,
  sessions: SessionStore,
  now: number,
): Promise<Session | null | 'invalid'> {
  if (header === undefined) return null;
  const token = BEARER.exec(header)?.[1];
  if (token === undefined) return 'invalid';
  const session = await sessions.find(token);
  if (session === null || session.expiresAt.getTime() <= now) return 'invalid';
  return session;
}

function matches(place: PlaceRecord, query: PlacesQuery, openAtMs: number | null): boolean {
  const status = placeStatus(place);
  if (query.status !== 'all' && status !== query.status) return false;
  if (query.types !== null && !query.types.includes(place.type)) return false;
  if (query.districts !== null && !query.districts.includes(place.district)) return false;
  if (query.priceLevels !== null && !query.priceLevels.includes(place.priceLevel)) return false;
  if (query.q !== null && !foldText(place.name).includes(query.q)) return false;
  if (
    openAtMs !== null &&
    (place.openingHours === null || !isOpenAt(place.openingHours, openAtMs))
  ) {
    return false;
  }
  return true;
}

function compareRanked(a: Ranked, b: Ranked): number {
  return compareCodePoints(a.key, b.key) || compareCodePoints(a.place.id, b.place.id);
}

function compareKey(item: Ranked, [key, id]: [string, string]): number {
  return compareCodePoints(item.key, key) || compareCodePoints(item.place.id, id);
}

async function visitedByAny(
  userPlaces: UserPlaceRepository,
  userIds: readonly string[],
): Promise<Set<string>> {
  const sets = await Promise.all(userIds.map((id) => userPlaces.visitedPlaceIds(id)));
  return new Set(sets.flatMap((set) => [...set]));
}

async function toViews(
  places: PlaceRecord[],
  caller: Session | null,
  memberIds: readonly string[] | null,
  userPlaces: UserPlaceRepository,
): Promise<PlaceView[]> {
  const [mine, group] = await Promise.all([
    caller === null
      ? null
      : Promise.all([
          userPlaces.wantToGoPlaceIds(caller.userId),
          userPlaces.visitedPlaceIds(caller.userId),
        ]),
    memberIds === null
      ? null
      : Promise.all(
          memberIds.map((id) =>
            Promise.all([userPlaces.wantToGoPlaceIds(id), userPlaces.visitedPlaceIds(id)]),
          ),
        ),
  ]);

  return places.map((place) => {
    // Name every field: a stored field that the contract does not list never leaks.
    const view: PlaceView = {
      id: place.id,
      name: place.name,
      type: place.type,
      district: place.district,
      address: place.address,
      location: place.location,
      setting: place.setting,
      priceLevel: place.priceLevel,
      ticketPriceVnd: place.ticketPriceVnd,
      openingHours: place.openingHours,
      status: placeStatus(place),
      photo: place.photo,
      source: place.source,
    };
    if (mine !== null) {
      const [wantToGo, visited] = mine;
      view.me = { wantToGo: wantToGo.has(place.id), visited: visited.has(place.id) };
    }
    if (group !== null) {
      view.group = {
        memberCount: group.length,
        wantToGoCount: group.filter(([wantToGo]) => wantToGo.has(place.id)).length,
        visitedCount: group.filter(([, visited]) => visited.has(place.id)).length,
      };
    }
    return view;
  });
}
