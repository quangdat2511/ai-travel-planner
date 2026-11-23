# Self-assessment: PA#2, harness and quality gate

Team: Ngo Tran Quang Dat (23127341), Ho Van Khai (23127059), Nguyen Gia Huy (23127378).

Repository: https://github.com/quangdat2511/ai-travel-planner, tag `pa2`.

| #   | Criterion                    | Max | Claimed | Evidence                                                                                                                                                                                                                |
| --- | ---------------------------- | --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Rules file                   | 15  | 12      | `CLAUDE.md`: four sections and a Never list about this product. Four lines trace to `e9dd13d` and to `AI-LOG.md` C3, C4, R3. We claim less than 13 because the assistant wrote the file and the team did not rewrite it |
| 2   | Permissions and secrets      | 10  | 9       | Tiers in `.claude/settings.json` and in the README. `.env.example` and its test `config.test.ts`. The `secrets` job scans the whole history. The README states the US$10 cap                                            |
| 3   | One command for every check  | 10  | 10      | README "Checks". CI runs `npm run <script>` for each script name. A fresh clone got all checks green on 23 Nov 2026 (`PA2.md`, section 3)                                                                               |
| 4   | CI that blocks a merge       | 20  | 19      | `docs/evidence/branch-protection.json`. PR #1 blocked at `0012817` (run 45132190787) and green at `65935bd` (run 45133008741). Since protection, main has only merge commits of pull requests                           |
| 5   | The contract of one endpoint | 25  | 23      | `docs/contract/get-places.md`: callers and six ownership rules, every parameter and field rule, eight problem types with status, order of checks, cursor paging, versions and changes                                   |
| 6   | Contract tests that bite     | 15  | 14      | `apps/api/test/contract/`, 118 tests in the required job `test:contract`. Each error type, ownership, paging. The deliberate break is PR #2 at `477897a` (run 45133284433), red and closed without a merge              |
| 7   | AI-LOG.md                    | 5   | 4       | `AI-LOG.md`: the tool and the parts it wrote, six Changed and six Rejected entries from this session                                                                                                                    |
|     | Total                        | 100 | 91      |                                                                                                                                                                                                                         |

## What we did not manage

- The assistant wrote `CLAUDE.md`, the contract and the tests. The team chose the stack and the
  endpoint, but did not rewrite those files by hand before the tag.
- There is no screenshot of the branch settings. The settings are in
  `docs/evidence/branch-protection.json`, as the GitHub API returns them.
- Branch protection needs 0 approving reviews, so one member can merge alone. The checks are
  required, but a second pair of eyes is not.
- The type list and the district list wait for the class dataset (27 Nov 2026). If the dataset
  uses other values, the contract changes in its own commit.
- Sign-in does not exist yet. The sessions come from an in-memory store, and the tests use fixture
  tokens.
- The model is not chosen yet, so `AI-LOG.md` has no cost for one plan.
- When a contract test fails, its message holds the whole response body, so the CI log is long.
