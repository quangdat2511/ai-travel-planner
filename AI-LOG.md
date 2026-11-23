# AI-LOG: PA#2

Team: Ngo Tran Quang Dat (23127341), Ho Van Khai (23127059), Nguyen Gia Huy (23127378).

## Tools

- Claude Code, with the model Claude Opus 5.5, in the Claude desktop app. It wrote the scaffold,
  `CLAUDE.md` and the CI workflow. It also wrote the contract, the contract tests, the route and
  the unit tests. It turned on branch protection through `gh api`. It drafted `PA2.md`, this file
  and the self-assessment.
- ESLint, Prettier, `tsc`, Vitest, gitleaks and GitHub branch protection. They are the gate that
  checked the assistant's output. Several entries below are findings of this gate.

The team chose the stack and the endpoint, and gave the model key details and the team list. The
assistant did the rest in one session on 23 Nov 2026, with a shell and `gh` signed in as
`quangdat2511`.

The product has no model call yet, so PA#2 has no model cost. The key and its cap are in the
README.

## How the work went

1. The assistant read the brief, the PA#2 rubric and the IA#3 `CONTRACT.md` (for the section
   layout). It asked the team two questions: the stack and the endpoint.
2. It pushed two commits straight to main: the scaffold (`6de0f8d`) and the contract (`7d9f910`).
   CI ran green on all six jobs (run `45130908804`).
3. Then it turned on branch protection. No commit reached main without a pull request after that.
4. In PR #1 it wrote the contract tests before the route (`0012817`, 114 of 118 red), then the
   route (`65935bd`, green).
5. In PR #2 it broke the contract on purpose in the code only. CI went red, and the PR was closed
   without a merge.

## Changed

Things that we changed in the assistant's output, or that the gate made it change. Each entry is
a real event of this session.

- C1. ESLint refused `_next` in the Express error handler, because the parameter is unused. Express
  knows an error handler by its four parameters, so the parameter must stay. We added
  `argsIgnorePattern: '^_'` with a comment in `eslint.config.js` (`6de0f8d`).
- C2. The assistant wrote the `invalid-cursor` tests and found a hole in section 4.6 of the
  contract. The section listed the filters that a cursor must repeat. It did not answer one
  question: are `status=checked` and no `status` the same filter? The assistant changed the
  contract first, in its own commit (`e9dd13d`). Then it wrote the test that holds the code to it
  (`0012817`). This is the source of a line in `CLAUDE.md`, Conventions.
- C3. A unit test that can never fail. The assistant wrote
  `expect('\u{1F600}' < '�').toBe(true)` in `test/unit/places-logic.test.ts`, to show what
  a plain `<` does with an emoji. Both sides are constants, so the line tests nothing. The
  type-aware lint rule `no-unnecessary-condition` refused it as "always true". We removed the line
  and kept the assertion on `compareCodePoints`. `npm run lint` found it before the commit
  (`65935bd`). This is the source of a line in `CLAUDE.md`, Never.
- C4. CRLF line endings. For the deliberate break (PR #2), the assistant changed `query.ts` with a
  Python one-off script. On Windows, `Path.write_text` wrote CRLF, and `npm run format:check`
  flagged the file. `.gitattributes` (`eol=lf`) turns CRLF into LF in the commit. So CI stays
  green, but the local check then differs from CI. We ran Prettier on the file before the commit
  (`477897a`). This is the source of a line in `CLAUDE.md`, Conventions.
- C5. Prettier turned the escape `'�'` in a test into the raw replacement character, which a
  reader cannot see. We wrote both characters with `String.fromCodePoint` and a comment.
- C6. Lint refused `now: clock.now` in the test helper (`unbound-method`) and two `as` casts after
  a zod parse. We changed the `Clock` interface to function properties, and parsed with explicit
  guards.

## Rejected

- R1. The endpoint. The assistant recommended `POST /plans/{planId}/save`, because it builds the
  validator early for PA#3. The team chose `GET /places`. The contract is in
  `docs/contract/get-places.md`.
- R2. The stack. The assistant offered three stacks: Node with Express, Bun with Hono and Biome,
  and Next.js with Firebase. The team chose Node 22, TypeScript and Express 5.
- R3. TypeScript 7. `npm view typescript version` gave 7.0.2, but the peer range of
  typescript-eslint 8.73 is `>=4.8.4 <6.1.0`. We pinned `typescript@~6.0.3`. This is the source of
  a line in `CLAUDE.md`, Stack.
- R4. `--if-present` on the root scripts. The assistant considered
  `npm run test --workspaces --if-present`. If the script name changes, that command runs nothing
  and exits 0, so the check can never fail. The root scripts name the workspace instead
  (`-w @atp/api`).
- R5. `passWithNoTests`. If a project finds no test file, Vitest fails. We kept that. So the
  `test:contract` job needed a real contract test from the first commit (`7d9f910`).
- R6. The local folder as the zip. The working folder holds a local `.env` with a cursor secret.
  The zip comes from a fresh `git clone` of the tag, so that no secret is in the submitted tree.
