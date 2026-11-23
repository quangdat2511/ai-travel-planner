# AI Travel Planner

A web app that builds a day-by-day schedule and spending plan for a weekend in Ho Chi Minh City.
It plans for one person, or for a group with a spending cap per member. It is the class project of
CSC13114, class 23KTPM1. The product brief comes from the product owners of the class.

This repository is at checkpoint PA#2: the rules, the checks and the quality gate. The API has one
endpoint contract, [`GET /v1/places`](docs/contract/get-places.md). The agent arrives in PA#3. The
evidence for PA#2 is in [PA2.md](PA2.md).

Team: Ngo Tran Quang Dat (23127341), Ho Van Khai (23127059), Nguyen Gia Huy (23127378).

## Start from a fresh clone

You need Node 22 (see `.nvmrc`) and npm 10.

```sh
git clone https://github.com/quangdat2511/ai-travel-planner.git
cd ai-travel-planner
npm ci
npm run check
```

`npm run check` runs every check below, in the same order as CI. It must end green.

To run the API on your machine, copy `.env.example` to `.env` and set `CURSOR_SECRET`. Then run
`npm run dev` and open `http://localhost:3000/v1/places`. The API serves the sample places in
`apps/api/data/places.sample.json`. They are fictional and not checked.

## Checks

Each check is one command. CI runs the same commands, one job each, in
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

| Check         | Command                 | Tool                                   |
| ------------- | ----------------------- | -------------------------------------- |
| Lint          | `npm run lint`          | ESLint with typescript-eslint, strict  |
| Format check  | `npm run format:check`  | Prettier. `npm run format` fixes files |
| Type check    | `npm run typecheck`     | TypeScript `tsc --noEmit`              |
| Unit tests    | `npm run test`          | Vitest                                 |
| Contract test | `npm run test:contract` | Vitest and supertest, against the API  |
| Secrets       | CI job `secrets`        | gitleaks, over every commit in history |

main is protected. A change reaches main only through a pull request, and all six jobs above are
required checks. The rule applies to admins too. Force-push and branch deletion are off.

## Configuration and secrets

The API reads its configuration from environment variables, only in `apps/api/src/config.ts`.
`.env.example` lists every variable without a value. If the two lists differ, or if the example
file holds a value, a unit test fails. `.env` is in `.gitignore`. The `secrets` job in CI scans the
whole git history with gitleaks on every pull request.

## Model and spending cap

The team's model API key is an OpenCode key. The account of that key has a spending cap of US$10
per month, set at the provider. The key stays in `.env` on the backend and never reaches the
browser.

The PA#2 code makes no model call and does not read the key. In PA#3, the variable for the key goes
into `.env.example` and `src/config.ts` together with the code that reads it. The model, and the
cost of one plan, are recorded here and in `AI-LOG.md` at that time.

## Assistant permissions

The coding assistant follows [CLAUDE.md](CLAUDE.md). Its permissions are written down in three
tiers in `.claude/settings.json`, which Claude Code enforces.

Allowed, with no question:

- read the code, and run the six checks and `npm run dev`
- use read-only `git` and `gh` commands
- commit on a branch
- edit `apps/api/src/` and the unit tests

Ask first:

- install, update or remove a package
- push, make a tag, or call `gh api`
- open, merge or close a pull request
- edit the contract, the contract tests, the place data or the CI workflow
- edit the rules file, the lint and format rules, or `.env.example`

Never:

- read or edit `.env`
- force-push, push to main, or delete a remote branch or tag
- skip the hooks, or merge with `--admin`
- change the repository or its branch protection with `gh api` or `gh repo edit`
- run `rm -rf`

These rules match command prefixes, so they are a guard, not a sandbox. The never list in
`CLAUDE.md` is the rule, and a human checks every pull request.

## Credits

The place data comes from the shared class dataset. It credits OpenStreetMap (map data, ODbL),
Wikimedia Commons (photos, each with its own licence) and Open-Meteo (weather, CC BY 4.0). The
product shows these credits next to the data.
