export interface GroupRepository {
  /** The user ids of the members, or `null` when no group has this id. */
  memberIds(groupId: string): Promise<readonly string[] | null>;
}

export class InMemoryGroupRepository implements GroupRepository {
  readonly #groups: ReadonlyMap<string, readonly string[]>;

  constructor(groups: Record<string, readonly string[]> = {}) {
    this.#groups = new Map(Object.entries(groups));
  }

  memberIds(groupId: string): Promise<readonly string[] | null> {
    return Promise.resolve(this.#groups.get(groupId) ?? null);
  }
}
