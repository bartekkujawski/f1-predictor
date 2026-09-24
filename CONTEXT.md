# F1 Predictor

A prediction game for groups of friends: Players predict the Top 10 of each scored Session
of an F1 Round, and are ranked in their League by points earned from official results.

## Language

### People and groups

**Player**:
A person who signs in and makes Predictions. Has one nickname, shown in every League.
_Avoid_: User, account, typer

**League**:
A group of Players competing in one Season Table. Grouping only: it does not change the rules
or the Predictions.
_Avoid_: Group, room

**Member**:
A Player who has joined a given League.
_Avoid_: Participant

**League Admin**:
The Member who created the League. Can regenerate the Join Code and remove Members.
_Avoid_: Owner, moderator

**App Admin**:
The operator of the whole app. Manages Regular Drivers and Substitutions and can trigger a result refresh.
_Avoid_: Superuser

**Join Code**:
A short code that lets a Player join a League. An invite link is just a Join Code wrapped in a URL.
_Avoid_: Invite token, invitation

### Calendar

**Season**:
One year of the F1 championship.

**Round**:
One race weekend of a Season, identified by its number in the calendar.
_Avoid_: Weekend, Grand Prix, event, race (a Race is one Session of a Round)

**Session**:
A single scored part of a Round: Sprint, Qualifying or Race. Practice and Sprint Qualifying are not Sessions.
_Avoid_: Event, stage

**Sprint Weekend**:
A Round that includes a Sprint.

**Lock**:
The moment a Session stops accepting Predictions: the start of the qualifying that sets its grid
(Sprint Qualifying for the Sprint, Qualifying for Qualifying and the Race).
_Avoid_: Deadline, cutoff, close

**Cancelled Session**:
A Session that produced no official classification. Nobody scores for it.

### Drivers

**Regular Driver**:
A driver on the Season's list of race seats. Predictions only ever name Regular Drivers.
_Avoid_: Driver (when the distinction matters), racer

**Substitution**:
A record that, in a given Round, another driver races in place of a Regular Driver. The
substitute's result counts as the Regular Driver's result.
_Avoid_: Replacement, stand-in

### Predictions and scoring

**Prediction**:
A Player's ordered list of ten different Regular Drivers for one Session. One per Player per
Session, shared across all the Player's Leagues.
_Avoid_: Tip, bet, typ, guess

**Pick**:
One Regular Driver at one position within a Prediction.
_Avoid_: Selection, entry

**Official Classification**:
The final published order of a Session, as reported by the results source. Drivers who are not
classified have no position.
_Avoid_: Results, standings (for a single Session)

**Top 10**:
Positions 1–10 of the Official Classification.

**Position Difference**:
The absolute gap between a Pick's position and that driver's position in the Top 10.

**Base Points**:
The points a Pick earns simply because its driver finished in the Top 10.

**Accuracy Bonus**:
The extra points a Pick earns based on its Position Difference.

**Exact Hit**:
A Pick with Position Difference 0. Used to break ties in the Season Table.
_Avoid_: Perfect pick, bullseye

**Perfect Top 10**:
A Prediction where all ten Picks are Exact Hits.

**Session Multiplier**:
The whole-number weight applied to a Session's points: Sprint lowest, Race highest.

**Session Score**:
The points a Player earns for one Session after the Session Multiplier.

**Final Round**:
A Round whose results can no longer change the scores. A Round becomes final when the next Round starts.

**Season Table**:
The ranking of a League's Members by total Session Scores in a Season.
_Avoid_: Leaderboard, ranking, standings
