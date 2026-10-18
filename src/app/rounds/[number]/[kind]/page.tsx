import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSignedInPlayer } from "../../../../auth/signed-in-player";
import { isSessionKind, type ScoredAgainst } from "../../../../calendar/session";
import { LocalTime } from "../../../../calendar/local-time";
import { getCurrentSessionPredictions } from "../../../../prediction/current-prediction";
import { PicksList } from "../../../../prediction/picks-list";
import type { SessionPredictions } from "../../../../prediction/prediction";
import { Top10List } from "../../../../prediction/top-10-list";
import type { SessionScore } from "../../../../scoring/session-score";

// Shown until what the Session is scored against is published, instead of a Session Score of 0 for
// everyone. The Starting Grid comes with the Race results (ADR-0008), so Qualifying waits for the Race.
const NOT_PUBLISHED_YET: Record<ScoredAgainst, string> = {
  "Starting Grid":
    "Qualifying is scored against the Starting Grid, which appears once the Race results are published. Points appear after the Race results.",
  "Official Classification": "The Official Classification is not published yet, so there are no points yet.",
};

// Shown for a Cancelled Session: the Round is final and nothing will be published any more.
const CANCELLED: Record<ScoredAgainst, string> = {
  "Starting Grid": "This Session was cancelled: the Race set no Starting Grid, so everyone scores 0.",
  "Official Classification": "This Session was cancelled: it has no Official Classification, so everyone scores 0.",
};

const SessionScoreView = ({ score }: { score: SessionScore }) => (
  <p>
    {score.points} points, {score.exactHits} {score.exactHits === 1 ? "Exact Hit" : "Exact Hits"}
  </p>
);

const Top10View = ({ session }: { session: SessionPredictions }) => (
  <section>
    <h2>Top 10 of the {session.scoredAgainst}</h2>
    {session.top10 ? (
      <Top10List top10={session.top10} regularDrivers={session.regularDrivers} />
    ) : session.cancelled ? (
      <p>{CANCELLED[session.scoredAgainst]}</p>
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
          {session.visible.members.map(({ nickname, prediction, score }, index) => (
            <section key={index}>
              <h2>{nickname}</h2>
              {score && <SessionScoreView score={score} />}
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
