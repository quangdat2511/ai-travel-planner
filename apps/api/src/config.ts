import { z } from 'zod';

// The only place that reads process.env (eslint.config.js enforces it).
// Every key here is listed in .env.example without a value (test/unit/config.test.ts).
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CURSOR_SECRET: z.string().min(32, 'must be at least 32 characters'),
  PLACES_DATA_FILE: z.string().min(1).default('data/places.sample.json'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: Record<string, string | undefined> = process.env): Config {
  // An empty value in .env means "not set", so the default applies.
  const present = Object.fromEntries(
    Object.keys(envSchema.shape).map((key) => [key, env[key] === '' ? undefined : env[key]]),
  );
  const result = envSchema.safeParse(present);
  if (!result.success) {
    // Name the variables, never print their values.
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid configuration. Fix .env:\n  ${problems.join('\n  ')}`);
  }
  return result.data;
}
