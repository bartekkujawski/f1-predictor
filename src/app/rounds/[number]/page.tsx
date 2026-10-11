import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSignedInPlayer } from "../../../auth/signed-in-player";
import { LocalTime } from "../../../calendar/local-time";
import { getCurrentPlayerPredictions } from "../../../prediction/current-prediction";
import type { RoundSession } from "../../../prediction/prediction";
import { PredictionForm } from "../../../prediction/prediction-form";
import type { RegularDriver } from "../../../results-source/results-source";

const LockedSessionView = ({ session, regularDrivers }: { session: RoundSession; regularDrivers: RegularDriver[] }) => {
  if (!session.prediction) {
    return <p>You have no Prediction for this Session, so you will score 0 for it.</p>;
  }
  const nameOf = new Map(regularDrivers.map((driver) => [driver.driverId, `${driver.name} (${driver.code})`]));
  return (
    <ol>
      {session.prediction.map((driverId) => (
        <li key={driverId}>{nameOf.get(driverId) ?? driverId}</li>
      ))}
    </ol>
  );
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
    <main>
      <Link href="/">Calendar</Link>
      <h1>
        Round {round.number}: {round.name}
      </h1>
      {round.sessions.map((session) => (
        <section key={session.kind}>
          <h2>{session.kind}</h2>
          <p>
            {session.state === "open" ? "Locks" : "Locked"} <LocalTime iso={session.locksAt.toISOString()} />
          </p>
          {session.state === "locked" ? (
            <LockedSessionView session={session} regularDrivers={round.regularDrivers} />
          ) : round.regularDrivers.length === 0 ? (
            // Regular Drivers come from the Season's first Race (ADR-0002).
            <p>The driver list is not available yet.</p>
          ) : (
            <PredictionForm round={round.number} session={session} regularDrivers={round.regularDrivers} />
          )}
        </section>
      ))}
    </main>
  );
}
