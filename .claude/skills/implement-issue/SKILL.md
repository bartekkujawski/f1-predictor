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

For every review finding the user decides to leave for later, open an issue labelled `needs-triage` (see `docs/agents/issue-tracker.md`). Quote the finding and the files it names. You are done when every finding is either fixed in a commit or has an issue, and your final message lists those issue numbers.

Push and open a PR only when the user asks.
