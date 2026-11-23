import { describe, expect, it } from 'vitest';
import { PROBLEM_TYPE_BASE, PROBLEMS, problem } from '../../src/http/problem.js';

describe('problem', () => {
  it('builds type, title and status from the slug', () => {
    expect(problem('forbidden', 'Only an admin can do this.')).toEqual({
      type: `${PROBLEM_TYPE_BASE}forbidden`,
      title: 'Not allowed',
      status: 403,
      detail: 'Only an admin can do this.',
    });
  });

  it('adds errors only when they are given', () => {
    expect(problem('not-found', 'No such path.')).not.toHaveProperty('errors');
    const errors = [{ parameter: 'limit', detail: 'must be an integer from 1 to 50' }];
    expect(problem('validation', '1 query parameter is invalid.', errors).errors).toEqual(errors);
  });

  it('uses only 4xx and 5xx statuses', () => {
    for (const { status } of Object.values(PROBLEMS)) {
      expect(status).toBeGreaterThanOrEqual(400);
      expect(status).toBeLessThan(600);
    }
  });
});
