import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { type PlaceRecord, placeRecordSchema } from './place.js';

export interface PlaceRepository {
  list(): Promise<readonly PlaceRecord[]>;
}

export class InMemoryPlaceRepository implements PlaceRepository {
  readonly #places = new Map<string, PlaceRecord>();

  constructor(places: readonly PlaceRecord[] = []) {
    for (const place of places) this.put(place);
  }

  list(): Promise<readonly PlaceRecord[]> {
    return Promise.resolve([...this.#places.values()]);
  }

  put(place: PlaceRecord): void {
    this.#places.set(place.id, place);
  }

  remove(id: string): void {
    this.#places.delete(id);
  }
}

export async function loadPlacesFile(path: string | URL): Promise<PlaceRecord[]> {
  const raw: unknown = JSON.parse(await readFile(path, 'utf8'));
  const places = z.array(placeRecordSchema).parse(raw);
  const ids = new Set<string>();
  for (const place of places) {
    if (ids.has(place.id)) throw new Error(`Duplicate place id in dataset: ${place.id}`);
    ids.add(place.id);
  }
  return places;
}
