---
name: implement-issue
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Start on a fresh branch from an up-to-date `origin/main`, named after the issue (e.g. `feat/season-table`). The branch is fresh when `git log origin/main..HEAD` is empty and `gh pr list --head <branch> --state all` lists no PR.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Commit each step yourself as soon as it is green: one change, one commit, on the issue's branch.

Once done, use /code-review to review the work. Each fix from the review is a commit of its own.

Push and open a PR only when the user asks.
