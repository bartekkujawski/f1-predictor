import Link from "next/link";
import { Card } from "../ui/card";
import type { Calendar, CalendarRound } from "./list-calendar";
import { LocalTime } from "./local-time";
import { SessionStatusBadge } from "./session-status-badge";

const RoundView = ({ round, isNextOpen }: { round: CalendarRound; isNextOpen: boolean }) => (
  <li>
    <article
      aria-current={isNextOpen ? "true" : undefined}
      className="rounded-lg border border-border bg-surface p-4 aria-[current=true]:border-accent"
    >
      <h3 className="font-semibold">
        <Link href={`/rounds/${round.number}`}>
          Round {round.number}: {round.name}
        </Link>
        {isNextOpen && <strong className="ml-2 text-sm text-accent">(next open Round)</strong>}
      </h3>
      <ul className="mt-2 space-y-1 text-sm text-text-muted">
        {round.sessions.map((session) => (
          <li key={session.kind} className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-text">{session.kind}</span>
            <SessionStatusBadge kind={session.kind} status={session.status} locksAt={session.locksAt} />
            <span>
              Lock <LocalTime iso={session.locksAt.toISOString()} />
            </span>
          </li>
        ))}
      </ul>
    </article>
  </li>
);

export const CalendarView = ({ calendar }: { calendar: Calendar }) => (
  <section>
    <h2 className="mb-3 text-lg font-semibold">Season {calendar.season}</h2>
    {calendar.rounds.length === 0 ? (
      <Card>
        <p className="text-text-muted">The calendar has not been synced yet.</p>
      </Card>
    ) : (
      <ol className="space-y-3">
        {calendar.rounds.map((round) => (
          <RoundView key={round.number} round={round} isNextOpen={round.number === calendar.nextOpenRound} />
        ))}
      </ol>
    )}
  </section>
);
