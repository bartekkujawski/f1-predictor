# Scores are computed on read, not stored

The database stores Predictions and Official Classifications only. Session Scores and the Season
Table are computed by a pure scoring function whenever they are read. Results can change after
post-race penalties until a Round becomes final, and computing on read means stored scores can never
drift from the data they come from. At this scale (a few Leagues × ~24 Rounds × up to 3 Sessions) the
computation is negligible. Revisit only if it is measured to be slow.
