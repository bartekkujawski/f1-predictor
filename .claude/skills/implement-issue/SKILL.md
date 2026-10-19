---
name: implement-issue
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Start on a fresh branch from an up-to-date `origin/main`, named after the issue (e.g. `feat/season-table`). The branch is fresh when `git log origin/main..HEAD` is empty and `gh pr list --head <branch> --state all` lists no PR.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the current branch.
