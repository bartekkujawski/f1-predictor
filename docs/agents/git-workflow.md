# Git workflow

One issue, one branch, one PR. `main` only changes through merged PRs.

## Start a branch

- Branch from an up-to-date `origin/main`: `git fetch --prune origin && git switch --no-track -c <branch> origin/main`.
  `--no-track` matters: without it the new branch tracks `origin/main`, and a bare `git push` aims at `main`.
- Name it `<kind>/<topic>`, with kind `feat`, `fix`, `refactor`, `docs` or `chore` (e.g. `feat/season-table`).
- A branch whose PR is merged is finished. New work goes on a new branch, even when it continues the same topic.
- Stacking on an unmerged branch is fine when the new work needs it: say "Stacked on #N" in the PR body.

## Open a PR

- First push: `git push -u origin <branch>`.
- Body: `## Summary` (what changed and *why*, the places worth reading carefully) and `## Test plan` (checked boxes,
  including `npm run typecheck`, `npm run lint`, `npm test` with the test count). Add `Closes #N` for the issue.
- Check CI with `gh pr checks <number>`. A job stuck in "Queued" with no workflow change is usually a GitHub Actions
  incident: check githubstatus.com before debugging.

## Prototype branches

The one exception to "one branch, one PR". A `/prototype` answers a design question with throwaway code,
which never reaches `main` but is kept as a primary source for whoever implements the decision.

- Branch from `origin/main` as above, named `prototype/<topic>` (e.g. `prototype/top-10-picker`).
- Commit the prototype and push it. Never open a PR for it.
- Put the verdict (the question it settled and the answer) and a link to the branch on the issue that
  implements the decision.
- Never delete it. `git branch -d` refuses because it is unmerged; do not force it with `-D`.

## After a merge

```sh
git switch main && git pull --ff-only && git fetch --prune origin
git branch --merged main    # candidates to delete
git branch -d <branch>      # -d refuses unmerged work; never -D without asking
```

GitHub deletes the remote branch on merge, so only local branches need cleaning.
