import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const app = createApp();

app.listen(config.PORT, () => {
  console.log(`AI Travel Planner API on http://localhost:${config.PORT}`);
});
