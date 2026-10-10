import type { Calendar, CalendarRound } from "./list-calendar";
import { LocalTime } from "./local-time";

const RoundView = ({ round, isNextOpen }: { round: CalendarRound; isNextOpen: boolean }) => (
  <li>
    <article aria-current={isNextOpen ? "true" : undefined}>
      <h3>
        Round {round.number}: {round.name}
        {isNextOpen && <strong> (next open Round)</strong>}
      </h3>
      <ul>
        {round.sessions.map((session) => (
          <li key={session.kind}>
            {session.kind}: {session.state}, Lock{" "}
            <LocalTime iso={session.locksAt.toISOString()} />
          </li>
        ))}
      </ul>
    </article>
  </li>
);

export const CalendarView = ({ calendar }: { calendar: Calendar }) => (
  <section>
    <h2>Season {calendar.season}</h2>
    {calendar.rounds.length === 0 ? (
      <p>The calendar has not been synced yet.</p>
    ) : (
      <ol>
        {calendar.rounds.map((round) => (
          <RoundView key={round.number} round={round} isNextOpen={round.number === calendar.nextOpenRound} />
        ))}
      </ol>
    )}
  </section>
);
