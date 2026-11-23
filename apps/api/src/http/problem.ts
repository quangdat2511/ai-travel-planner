import type { Response } from 'express';

// Problem details (RFC 9457). The table is section 2 of docs/contract/get-places.md.
export const PROBLEM_TYPE_BASE = 'https://ai-travel-planner.example/problems/';

export const PROBLEMS = {
  validation: { status: 400, title: 'Invalid request' },
  'invalid-cursor': { status: 400, title: 'Invalid cursor' },
  unauthenticated: { status: 401, title: 'Sign-in required' },
  forbidden: { status: 403, title: 'Not allowed' },
  'group-not-found': { status: 404, title: 'Group not found' },
  'not-found': { status: 404, title: 'Not found' },
  'method-not-allowed': { status: 405, title: 'Method not allowed' },
  internal: { status: 500, title: 'Internal error' },
} as const;

export type ProblemSlug = keyof typeof PROBLEMS;

export interface ParameterError {
  parameter: string;
  detail: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: ParameterError[];
}

export const INTERNAL_DETAIL = 'Something went wrong on our side. Try again later.';

export function problem(slug: ProblemSlug, detail: string, errors?: ParameterError[]): Problem {
  const { status, title } = PROBLEMS[slug];
  const body: Problem = { type: PROBLEM_TYPE_BASE + slug, title, status, detail };
  if (errors !== undefined) body.errors = errors;
  return body;
}

export function sendProblem(
  res: Response,
  slug: ProblemSlug,
  detail: string,
  errors?: ParameterError[],
): void {
  const body = problem(slug, detail, errors);
  res.status(body.status).type('application/problem+json').set('Cache-Control', 'no-store');
  if (slug === 'unauthenticated') res.set('WWW-Authenticate', 'Bearer');
  res.json(body);
}
