// docs/contract/get-places.md, section 2: the error model under /v1.
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { makeTestApp } from '../support/app.js';

const BASE = 'https://ai-travel-planner.example/problems/';

describe('section 2: errors are problem details', () => {
  it('answers a /v1 path that does not exist with 404 not-found', async () => {
    const { app } = makeTestApp();
    const res = await request(app).get('/v1/no-such-path');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/problem\+json/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      type: `${BASE}not-found`,
      title: 'Not found',
      status: 404,
      detail: expect.any(String) as string,
    });
  });

  it('keeps the status member equal to the HTTP status', async () => {
    const { app } = makeTestApp();
    const res = await request(app).delete('/v1/no-such-path');

    expect(res.status).toBe(404);
    expect((res.body as { status: number }).status).toBe(res.status);
  });
});
