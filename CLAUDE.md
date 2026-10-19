# f1-predictor

Typer F1 dla znajomych: liga typuje wyniki weekendu wyścigowego, typy zamykają się
na starcie kwalifikacji, wyniki przychodzą z API (Jolpica), aplikacja liczy punkty i tabelę.

## To jest projekt do nauki i portfolio

Autor uczy się full-stack TypeScript i szuka pierwszej pracy jako developer.
Ten kod musi dać się obronić na rozmowie rekrutacyjnej.

- Autor ma rozumieć każdą zmianę przed PR. Przy większej zmianie wyjaśnij *dlaczego*,
  nie tylko *co*, i wskaż miejsca, które warto przeczytać uważnie.
- Małe kroki: jedna zmiana, jeden commit. Poza `/implement-issue` nie generuj całych funkcji naraz bez prośby.
- W `/implement-issue` agent sam commituje każdy krok. Poza nim commituj tylko na prośbę. Push i PR zawsze tylko na wyraźną prośbę.
- Nazwy w kodzie biorą się ze słownika domeny (`CONTEXT.md`), nie z frameworka.

## Język

Rozmowa po polsku. Kod, nazwy, commity i README po angielsku.

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `bartekkujawski/f1-predictor` (via `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
