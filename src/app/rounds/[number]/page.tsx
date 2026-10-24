import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSignedInPlayer } from "../../../auth/signed-in-player";
import { LocalTime } from "../../../calendar/local-time";
import { SessionStatusBadge } from "../../../calendar/session-status-badge";
import { getCurrentPlayerPredictions } from "../../../prediction/current-prediction";
import type { RoundSession } from "../../../prediction/prediction";
import { PicksList } from "../../../prediction/picks-list";
import { PredictionForm } from "../../../prediction/prediction-form";
import type { RegularDriver } from "../../../results-source/results-source";
import { Card } from "../../../ui/card";

const LockedSessionView = ({ session, regularDrivers }: { session: RoundSession; regularDrivers: RegularDriver[] }) => {
  if (!session.prediction) {
    return <p>You have no Prediction for this Session, so you will score 0 for it.</p>;
  }
  return <PicksList prediction={session.prediction} regularDrivers={regularDrivers} />;
};

// One Round, where a Member builds a Top 10 for each of its Sessions until the Lock.
export default async function RoundPage({ params }: PageProps<"/rounds/[number]">) {
  const roundNumber = Number((await params).number);
  if (!Number.isInteger(roundNumber)) {
    notFound();
  }
  const player = await getSignedInPlayer();
  if (!player) {
    redirect("/");
  }
  const outcome = await getCurrentPlayerPredictions(player.id, roundNumber);
  if (outcome.status === "not-a-member") {
    // The home page asks the Player to join first.
    redirect("/");
  }
  if (outcome.status === "no-such-round") {
    notFound();
  }
  const { round } = outcome;

  return (
    <main className="space-y-4">
      <Link href="/rounds" className="text-sm text-text-muted">
        Calendar
      </Link>
      <h1 className="text-2xl font-bold">
        Round {round.number}: {round.name}
      </h1>
      {round.sessions.map((session) => (
        <Card key={session.kind} className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">
              <Link href={`/rounds/${round.number}/${session.kind}`}>{session.kind}</Link>
            </h2>
            <SessionStatusBadge session={session} />
          </div>
          <p className="text-sm text-text-muted">
            {session.status.state === "open" ? "Locks" : "Locked"} <LocalTime iso={session.locksAt.toISOString()} />
          </p>
          {session.status.state !== "open" ? (
            <LockedSessionView session={session} regularDrivers={round.regularDrivers} />
          ) : round.regularDrivers.length === 0 ? (
            // Regular Drivers come from the Season's first Race (ADR-0002).
            <p>The driver list is not available yet.</p>
          ) : (
            <PredictionForm round={round.number} session={session} regularDrivers={round.regularDrivers} />
          )}
        </Card>
      ))}
    </main>
  );
}
