import { createApp } from './app.js';
import { InMemorySessionStore } from './auth/sessions.js';
import { loadConfig } from './config.js';
import { InMemoryGroupRepository } from './groups/repository.js';
import { InMemoryPlaceRepository, loadPlacesFile } from './places/repository.js';
import { InMemoryUserPlaceRepository } from './users/user-places.js';

const config = loadConfig();
const places = await loadPlacesFile(new URL(`../${config.PLACES_DATA_FILE}`, import.meta.url));

// PA#2 has no sign-in and no database yet: every caller is anonymous.
const app = createApp({
  places: new InMemoryPlaceRepository(places),
  groups: new InMemoryGroupRepository(),
  userPlaces: new InMemoryUserPlaceRepository(),
  sessions: new InMemorySessionStore(),
  cursorSecret: config.CURSOR_SECRET,
});

app.listen(config.PORT, () => {
  console.log(`AI Travel Planner API on http://localhost:${config.PORT} (${places.length} places)`);
});
