import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSignedInPlayer } from "../../../../auth/signed-in-player";
import { isSessionKind, type ScoredAgainst } from "../../../../calendar/session";
import { LocalTime } from "../../../../calendar/local-time";
import { SessionStatusBadge } from "../../../../calendar/session-status-badge";
import { getCurrentSessionPredictions } from "../../../../prediction/current-prediction";
import { PicksList } from "../../../../prediction/picks-list";
import type { SessionPredictions } from "../../../../prediction/prediction";
import { Top10List } from "../../../../prediction/top-10-list";
import type { SessionScore } from "../../../../scoring/session-score";
import { Card } from "../../../../ui/card";

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
  <p className="text-sm text-text-muted tabular-nums">
    {score.points} points, {score.exactHits} {score.exactHits === 1 ? "Exact Hit" : "Exact Hits"}
  </p>
);

const Top10View = ({ session: { status, top10, scoredAgainst, regularDrivers } }: { session: SessionPredictions }) => (
  <Card className="space-y-3">
    <h2 className="text-lg font-semibold">Top 10 of the {scoredAgainst}</h2>
    {top10 ? (
      <Top10List top10={top10} regularDrivers={regularDrivers} />
    ) : (
      <p className="text-text-muted">{(status.state === "cancelled" ? CANCELLED : NOT_PUBLISHED_YET)[scoredAgainst]}</p>
    )}
  </Card>
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
    <main className="space-y-4">
      <Link href={`/rounds/${session.round.number}`} className="text-sm text-text-muted">
        Round {session.round.number}: {session.round.name}
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{session.kind}</h1>
        <SessionStatusBadge kind={session.kind} status={session.status} locksAt={session.locksAt} />
      </div>
      {session.visible.state === "open" ? (
        <>
          <p className="text-text-muted">
            Other Members&apos; Predictions appear at the Lock, <LocalTime iso={session.locksAt.toISOString()} />.
          </p>
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Your Prediction</h2>
            {session.visible.own ? (
              <PicksList prediction={session.visible.own} regularDrivers={session.regularDrivers} />
            ) : (
              <p className="text-text-muted">You have no Prediction for this Session yet.</p>
            )}
          </Card>
        </>
      ) : (
        <>
          <p className="text-text-muted">
            Locked <LocalTime iso={session.locksAt.toISOString()} />.
          </p>
          <Top10View session={session} />
          {/* Nicknames need not be unique, and the list never reorders, so the index is the key. */}
          {session.visible.members.map(({ nickname, prediction, score }, index) => (
            <Card key={index} className="space-y-2">
              <h2 className="text-lg font-semibold">{nickname}</h2>
              {score && <SessionScoreView score={score} />}
              {prediction ? (
                <PicksList prediction={prediction} regularDrivers={session.regularDrivers} />
              ) : (
                <p className="text-text-muted">No Prediction.</p>
              )}
            </Card>
          ))}
        </>
      )}
    </main>
  );
}
