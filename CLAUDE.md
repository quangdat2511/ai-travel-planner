# AI Travel Planner: rules for the coding assistant

Read this file before you change anything. Keep it short. A rule with a story names the commit or
the `AI-LOG.md` entry that caused it.

## Stack

- Node 22 (`.nvmrc`), npm workspaces, TypeScript 6 in strict mode, ES modules. Relative imports end
  in `.js`.
- Keep TypeScript on `~6.0`. typescript-eslint 8 supports TypeScript below 6.1 only, and npm offers
  7.0 (`AI-LOG.md`, R3).
- `apps/api`: Express 5 API. zod checks every input. Vitest and supertest for tests.
- Data in PA#2: in-memory repositories behind interfaces. The class dataset (due 27 Nov) replaces the
  sample data.
- No model call exists yet. From PA#3, only the backend calls the model, through the seven tools of
  the brief.

## Commands

Run them from the repository root. CI runs exactly these commands.

| Command                 | What it does                                    |
| ----------------------- | ----------------------------------------------- |
| `npm ci`                | install from the lock file                      |
| `npm run lint`          | ESLint, zero warnings allowed                   |
| `npm run format:check`  | Prettier check. `npm run format` writes fixes   |
| `npm run typecheck`     | `tsc --noEmit`                                  |
| `npm run test`          | unit tests                                      |
| `npm run test:contract` | contract tests for `docs/contract/*.md`         |
| `npm run check`         | all five, in CI order. Run it before you finish |

## Conventions

- The contract is the specification: `docs/contract/get-places.md`. If code and contract disagree,
  the code is wrong. If the contract is silent on a case, change the contract first. Do it in its
  own commit that says why, then change the test (`e9dd13d`, from the cursor tests).
- Every error under `/v1` is a problem details object from `src/http/problem.ts`. Never send
  `res.status(400).json({ error })`.
- Money is an integer number of dong, in a field whose name ends in `Vnd`. Code computes money. A
  model never does.
- Times are Asia/Ho_Chi_Minh (UTC+7). Parse an instant only with an explicit offset.
- Read environment variables only in `src/config.ts`. List each one in `.env.example`, without a
  value.
- Change files with the editor tool, then `npm run format`. A Python script on Windows wrote CRLF
  line endings, and `format:check` failed (`AI-LOG.md`, C4).
- Work on a branch and open a pull request. main is protected. Use Conventional Commits (`feat:`,
  `fix:`, `test:`, `docs:`, `ci:`, `chore:`).
- Your permissions are in `.claude/settings.json`: allow, ask, deny.

## Never

- Never put a model API key or any other secret in browser code, in a commit, or in a log line.
- Never call a real model or the network in a unit test or a contract test. Inject a fake.
- Never edit a test, the eval data, the contract or a validator rule to make a check pass. Fix the
  code, or stop and ask.
- Never send a user's name or email address to a model. Send places and interests only.
- Never make a check unable to fail: no `continue-on-error`, `--passWithNoTests`, `|| true`, and
  no `--if-present` on a check script.
- Never write an assertion that cannot fail. Lint caught `expect(a < b).toBe(true)` on two
  constants in a unit test (`AI-LOG.md`, C3).
- Never push to main, force-push, merge a red pull request, or use `--no-verify`.
- Never read `.env` or print a secret.
