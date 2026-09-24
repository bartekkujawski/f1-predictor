# One ruleset in code; Predictions belong to the Player, not the League

All Leagues play by the same rules, defined as constants next to the scoring function rather than as
per-League settings. Because the rules never differ between Leagues, a Player makes one Prediction per
Session and it counts in every League they are a Member of; a League is only a group of Players with
its own Season Table. Per-League settings would multiply the cases to test and complicate the data
model for a group of friends who agreed on one set of rules.

## Consequences

- Adding configurable rules later would also mean moving Predictions from the Player to the Membership.
