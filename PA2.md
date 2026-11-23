# PA#2: harness and quality gate

AI Travel Planner · CSC13114 · 23KTPM1

Team: Ngo Tran Quang Dat (23127341), Ho Van Khai (23127059), Nguyen Gia Huy (23127378).

Submitted commit: tag `pa2`.

## Links

| What                            | Link                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository (public)             | https://github.com/quangdat2511/ai-travel-planner                                                                                                                                                                                                                                                                                                                                                                                                 |
| Protected-branch settings       | https://github.com/quangdat2511/ai-travel-planner/settings/branches (admins only). The same settings, as GitHub returns them: [docs/evidence/branch-protection.json](docs/evidence/branch-protection.json)                                                                                                                                                                                                                                        |
| Blocked pull request            | [PR #1](https://github.com/quangdat2511/ai-travel-planner/pull/1) at commit [`0012817`](https://github.com/quangdat2511/ai-travel-planner/commit/0012817531c5889f34297dd46e98541d25401de6): red run [45132190787](https://github.com/quangdat2511/ai-travel-planner/actions/runs/45132190787), failing job [`test:contract`](https://github.com/quangdat2511/ai-travel-planner/actions/runs/45132190787/job/137549996087)                         |
| The commit that turned it green | [`65935bd`](https://github.com/quangdat2511/ai-travel-planner/commit/65935bd26bb2e845a989b4d1b3a19ebae88ebd4e) in [PR #1](https://github.com/quangdat2511/ai-travel-planner/pull/1): green run [45133008741](https://github.com/quangdat2511/ai-travel-planner/actions/runs/45133008741), merged as [`5106d00`](https://github.com/quangdat2511/ai-travel-planner/commit/5106d00ffe32ff5d555eca36d55cf9d2190f3aae)                                |
| Deliberate contract break       | [PR #2](https://github.com/quangdat2511/ai-travel-planner/pull/2) at commit [`477897a`](https://github.com/quangdat2511/ai-travel-planner/commit/477897a575ae4f4d64e2750781719c776d2a2f48): red run [45133284433](https://github.com/quangdat2511/ai-travel-planner/actions/runs/45133284433), failing job [`test:contract`](https://github.com/quangdat2511/ai-travel-planner/actions/runs/45133284433/job/137553500092). Closed without a merge |
| CI run for the tag              | https://github.com/quangdat2511/ai-travel-planner/actions?query=branch%3Apa2 (the workflow runs on every tag that starts with `pa`)                                                                                                                                                                                                                                                                                                               |
| History of main                 | https://github.com/quangdat2511/ai-travel-planner/commits/main                                                                                                                                                                                                                                                                                                                                                                                    |

## 1. The rules file

[CLAUDE.md](CLAUDE.md) has the four sections: Stack, Commands, Conventions, Never. The Never list
is about this product. It forbids a model key in browser code and a real model call in a test. It
also forbids an edit to a test, the eval data, the contract or a validator rule to make a check
pass. Four lines name the event that caused them:

| Line in `CLAUDE.md`                                     | Event                                                     |
| ------------------------------------------------------- | --------------------------------------------------------- |
| Stack: keep TypeScript on `~6.0`                        | `AI-LOG.md` R3: typescript-eslint 8 does not support TS 7 |
| Conventions: if the contract is silent, change it first | commit `e9dd13d`, `AI-LOG.md` C2                          |
| Conventions: change files with the editor tool          | `AI-LOG.md` C4: a Python script on Windows wrote CRLF     |
| Never: an assertion that cannot fail                    | `AI-LOG.md` C3: lint refused an always-true test line     |

[AGENTS.md](AGENTS.md) points other tools to `CLAUDE.md`.

## 2. Permissions and secrets

- The assistant's permissions are in three tiers (allow, ask, deny) in
  [`.claude/settings.json`](.claude/settings.json). The README lists them in plain words.
- [`.env.example`](.env.example) lists every variable without a value. The unit test
  `apps/api/test/unit/config.test.ts` fails on a difference between that file and `src/config.ts`,
  and on a value in that file.
- The `secrets` job scans every commit of the history with gitleaks 8.30.1 on every pull request,
  on main and on the tag. No run found a secret.
- The model key is an OpenCode key with a spending cap of US$10 per month. The README says so.

## 3. One command for every check

| Check          | Command, locally and in CI |
| -------------- | -------------------------- |
| Lint           | `npm run lint`             |
| Format check   | `npm run format:check`     |
| Type check     | `npm run typecheck`        |
| Unit tests     | `npm run test`             |
| Contract tests | `npm run test:contract`    |

The CI job `check` is a matrix over these five script names, and each job runs
`npm run <script>`. So CI cannot run a different command from the README. On 23 Nov 2026, a fresh
`git clone` on Windows (with `core.autocrlf=true`) followed the README and got all five green.

## 4. CI that blocks a merge

- main is protected. The six jobs `lint`, `format:check`, `typecheck`, `test`, `test:contract` and
  `secrets` are required checks, bound to the GitHub Actions app (id 15368). The branch must be up
  to date before a merge. The rule applies to admins. Force-push and deletion are off. A change
  needs a pull request.
- Before protection, two commits went straight to main: `6de0f8d` and `7d9f910`. Since then, every
  commit on main arrived through a merge of a pull request.
- PR #1 was blocked. At commit `0012817`, the contract tests existed and the route did not.
  `test:contract` failed (114 of 118 tests), and the other five checks passed. A merge attempt got
  this answer:

  ```text
  $ gh pr merge 1 --merge
  X Pull request quangdat2511/ai-travel-planner#1 is not mergeable: the base branch policy prohibits the merge.
  ```

  GitHub reported `mergeStateStatus: BLOCKED`. Commit `65935bd` added the route. All six checks
  went green, and the state became `CLEAN`. The merge kept both commits (`5106d00`).

## 5. The contract of one endpoint

[docs/contract/get-places.md](docs/contract/get-places.md) specifies `GET /v1/places`, with the
sections of the IA#3 contract: conventions, errors, resources, endpoints, versions.

- The callers: anonymous, member (`traveler`, `business`) and `admin`, with what each can use.
- Six ownership rules. The `me` block uses only the caller's data. Only a member can use a
  `groupId`. A non-member gets the same `404` as a missing group, admins included. The group block
  holds counts only. The cache headers keep one user's data out of shared caches.
- Every query parameter with its rule and default. A filter that the server cannot read gives
  `400 validation`. The server never ignores it.
- Eight problem types (RFC 9457). Each has its status, its title, the case that causes it, and the
  action of the client. The order of the eight checks.
- Paging with a signed, opaque cursor: `nextCursor` rules, 24-hour life, pages that do not move,
  and `openAt=now` fixed for the whole walk.
- Changes: additive changes only in `/v1`, a list of breaking changes that need `/v2`, and the
  rules for a new dataset.

## 6. Contract tests that bite

The contract tests are in `apps/api/test/contract/`, 118 tests in five files. They run in the
required job `test:contract`. The response shapes in `test/support/contract.ts` come from the
contract, not from `src/`.

- Every problem type has its own tests, with the full shape of section 2.
- Ownership: another user's check-ins never show in the caller's `me` block and never change the
  caller's response. A non-member's `groupId` gives `404 group-not-found`, with the same body as a
  missing group. No parameter can name another user (`400 validation`).
- Paging: every place once, in order. No cursor leads to an empty page. A cursor with other filters,
  a changed character or an age above 24 hours gives `invalid-cursor`. Pages stay put while places
  are added or removed.
- The deliberate break: PR #2 changed only the code, so that `limit=51` gives 50 places. The test
  `refuses limit 51, which is not clamped to 50` failed, `test:contract` went red, and the merge
  was blocked. The PR was closed without a merge.

## 7. AI-LOG.md

[AI-LOG.md](AI-LOG.md) names the tool and the parts it wrote, with six Changed entries and six
Rejected entries from this session.

## How the zip was built

The zip comes from a fresh `git clone` of the repository at tag `pa2`, with `.git`. It does not
come from the working folder, because that folder holds a local `.env`.
