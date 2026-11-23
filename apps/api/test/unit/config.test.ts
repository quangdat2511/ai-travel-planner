import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { envSchema, loadConfig } from '../../src/config.js';

const exampleFile = readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8');
const exampleLines = exampleFile
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => line !== '' && !line.startsWith('#'));

describe('.env.example', () => {
  it('lists every variable that src/config.ts reads, and nothing else', () => {
    const listed = exampleLines.map((line) => line.split('=')[0]).sort();
    expect(listed).toEqual(Object.keys(envSchema.shape).sort());
  });

  it('has no value for any variable', () => {
    for (const line of exampleLines) {
      expect(line, `${line} must not carry a value`).toMatch(/^[A-Z0-9_]+=$/);
    }
  });
});

describe('loadConfig', () => {
  const secret = 'x'.repeat(32);

  it('applies defaults for empty values', () => {
    const config = loadConfig({ CURSOR_SECRET: secret, PORT: '', PLACES_DATA_FILE: '' });
    expect(config).toEqual({
      CURSOR_SECRET: secret,
      PORT: 3000,
      PLACES_DATA_FILE: 'data/places.sample.json',
    });
  });

  it('refuses a short cursor secret and does not print it', () => {
    expect(() => loadConfig({ CURSOR_SECRET: 'short-secret' })).toThrow(/CURSOR_SECRET/);
    expect(() => loadConfig({ CURSOR_SECRET: 'short-secret' })).not.toThrow(/short-secret/);
  });
});
