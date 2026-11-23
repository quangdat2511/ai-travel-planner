import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { placeStatus } from '../../src/places/place.js';
import { loadPlacesFile } from '../../src/places/repository.js';

const SAMPLE = new URL('../../data/places.sample.json', import.meta.url);

describe('loadPlacesFile', () => {
  it('loads the sample dataset that npm run dev serves', async () => {
    const places = await loadPlacesFile(SAMPLE);
    expect(places.length).toBeGreaterThan(0);
  });

  it('marks a place without hours or menu as incomplete', async () => {
    const places = await loadPlacesFile(SAMPLE);
    const statuses = new Map(places.map((place) => [place.id, placeStatus(place)]));
    expect(statuses.get('quan-moi-mau')).toBe('incomplete');
    expect(statuses.get('cho-dem-vi-du')).toBe('checked');
  });

  it('refuses a dataset with a duplicate id', async () => {
    const [first] = await loadPlacesFile(SAMPLE);
    const dir = await mkdtemp(join(tmpdir(), 'atp-'));
    const file = join(dir, 'places.json');
    await writeFile(file, JSON.stringify([first, first]));
    await expect(loadPlacesFile(file)).rejects.toThrow(/Duplicate place id/);
  });

  it('refuses a row that breaks the schema', async () => {
    const [first] = await loadPlacesFile(SAMPLE);
    const dir = await mkdtemp(join(tmpdir(), 'atp-'));
    const file = join(dir, 'places.json');
    await writeFile(file, JSON.stringify([{ ...first, priceLevel: 5 }]));
    await expect(loadPlacesFile(file)).rejects.toThrow();
  });
});
