import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSignedInPlayer } from "../../../../auth/signed-in-player";
import { isSessionKind, type ScoredAgainst } from "../../../../calendar/session";
import { LocalTime } from "../../../../calendar/local-time";
import { getCurrentSessionPredictions } from "../../../../prediction/current-prediction";
import { PicksList } from "../../../../prediction/picks-list";
import type { SessionPredictions } from "../../../../prediction/prediction";
import { Top10List } from "../../../../prediction/top-10-list";

// Shown until what the Session is scored against is published. The Starting Grid comes with the
// Race results (ADR-0008), so Qualifying waits for the Race.
const NOT_PUBLISHED_YET: Record<ScoredAgainst, string> = {
  "Starting Grid": "Qualifying is scored against the Starting Grid, which appears once the Race results are published.",
  "Official Classification": "The Official Classification is not published yet.",
};

const Top10View = ({ session }: { session: SessionPredictions }) => (
  <section>
    <h2>Top 10 of the {session.scoredAgainst}</h2>
    {session.top10 ? (
      <Top10List top10={session.top10} regularDrivers={session.regularDrivers} />
    ) : (
      <p>{NOT_PUBLISHED_YET[session.scoredAgainst]}</p>
    )}
  </section>
);

// One Session's Predictions: the viewer's own until the Lock, every Member's from the Lock on.
export default async function SessionPage({ params }: PageProps<"/rounds/[number]/[kind]">) {
  const { number, kind } = await params;
  const roundNumber = Number(number);
  if (!Number.isInteger(roundNumber) || !isSessionKind(kind)) {
    notFound();
  }
  const player = await getSignedInPlayer();
  if (!player) {
    redirect("/");
  }
  const outcome = await getCurrentSessionPredictions(player.id, roundNumber, kind);
  if (outcome.status === "not-a-member") {
    // The home page asks the Player to join first.
    redirect("/");
  }
  if (outcome.status === "no-such-session") {
    notFound();
  }
  const { session } = outcome;

  return (
    <main>
      <Link href={`/rounds/${session.round.number}`}>
        Round {session.round.number}: {session.round.name}
      </Link>
      <h1>{session.kind}</h1>
      {session.visible.state === "open" ? (
        <>
          <p>
            Other Members&apos; Predictions appear at the Lock, <LocalTime iso={session.locksAt.toISOString()} />.
          </p>
          <h2>Your Prediction</h2>
          {session.visible.own ? (
            <PicksList prediction={session.visible.own} regularDrivers={session.regularDrivers} />
          ) : (
            <p>You have no Prediction for this Session yet.</p>
          )}
        </>
      ) : (
        <>
          <p>
            Locked <LocalTime iso={session.locksAt.toISOString()} />.
          </p>
          <Top10View session={session} />
          {/* Nicknames need not be unique, and the list never reorders, so the index is the key. */}
          {session.visible.members.map(({ nickname, prediction }, index) => (
            <section key={index}>
              <h2>{nickname}</h2>
              {prediction ? (
                <PicksList prediction={prediction} regularDrivers={session.regularDrivers} />
              ) : (
                <p>No Prediction.</p>
              )}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
