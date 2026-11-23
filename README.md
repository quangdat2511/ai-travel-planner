# AI Travel Planner

A web app that builds a day-by-day schedule and spending plan for a weekend in Ho Chi Minh City.
It plans for one person, or for a group with a spending cap per member. It is the class project of
CSC13114, class 23KTPM1. The product brief comes from the product owners of the class.

This repository is at checkpoint PA#2: the rules, the checks and the quality gate. The API has one endpoint
contract, [`GET /v1/places`](docs/contract/get-places.md). The agent arrives in PA#3.

## Start from a fresh clone

You need Node 22 (see `.nvmrc`) and npm 10.

```sh
git clone https://github.com/quangdat2511/ai-travel-planner.git
cd ai-travel-planner
npm ci
npm run check
```

`npm run check` runs every check below, in the same order as CI. It must end green.

To run the API on your machine, copy `.env.example` to `.env`, set `CURSOR_SECRET`, then run
`npm run dev`.

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

## Configuration and secrets

The API reads its configuration from environment variables, only in `apps/api/src/config.ts`.
`.env.example` lists every variable without a value. If the two lists differ, or if the example
file holds a value, a unit test fails. `.env` is in `.gitignore`. The `secrets` job in CI scans the
whole git history with gitleaks on every pull request.

## Credits

The place data comes from the shared class dataset. It credits OpenStreetMap (map data, ODbL),
Wikimedia Commons (photos, each with its own licence) and Open-Meteo (weather, CC BY 4.0). The
product shows these credits next to the data.
