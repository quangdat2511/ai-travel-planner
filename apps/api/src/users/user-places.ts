// A user's own places: check-ins (visited) and the want-to-go list.
export interface UserPlaceRepository {
  visitedPlaceIds(userId: string): Promise<ReadonlySet<string>>;
  wantToGoPlaceIds(userId: string): Promise<ReadonlySet<string>>;
}

export class InMemoryUserPlaceRepository implements UserPlaceRepository {
  readonly #visited = new Map<string, Set<string>>();
  readonly #wantToGo = new Map<string, Set<string>>();

  checkIn(userId: string, placeId: string): void {
    addTo(this.#visited, userId, placeId);
  }

  addWantToGo(userId: string, placeId: string): void {
    addTo(this.#wantToGo, userId, placeId);
  }

  visitedPlaceIds(userId: string): Promise<ReadonlySet<string>> {
    return Promise.resolve(new Set(this.#visited.get(userId)));
  }

  wantToGoPlaceIds(userId: string): Promise<ReadonlySet<string>> {
    return Promise.resolve(new Set(this.#wantToGo.get(userId)));
  }
}

function addTo(index: Map<string, Set<string>>, userId: string, placeId: string): void {
  const set = index.get(userId) ?? new Set<string>();
  set.add(placeId);
  index.set(userId, set);
}
