export const ROLES = ['traveler', 'business', 'admin'] as const;
export type Role = (typeof ROLES)[number];

export interface Session {
  userId: string;
  role: Role;
  expiresAt: Date;
}

// Sign-in is not built yet (PA#3). Until then, sessions come from this store.
export interface SessionStore {
  find(token: string): Promise<Session | null>;
}

export class InMemorySessionStore implements SessionStore {
  readonly #sessions: ReadonlyMap<string, Session>;

  constructor(sessions: Record<string, Session> = {}) {
    this.#sessions = new Map(Object.entries(sessions));
  }

  find(token: string): Promise<Session | null> {
    return Promise.resolve(this.#sessions.get(token) ?? null);
  }
}
