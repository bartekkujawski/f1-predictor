import { Badge } from "../ui/badge";
import { LockCountdown } from "./lock-countdown";
import { type ScoredAgainst, scoredAgainst, type SessionKind, type SessionStatus } from "./session";

// What a locked Session waits for. The Starting Grid comes with the Race results (ADR-0008).
const WAITING_FOR: Record<ScoredAgainst, string> = {
  "Starting Grid": "waiting for the Starting Grid",
  "Official Classification": "waiting for results",
};

const LockedBadge = ({ kind }: { kind: SessionKind }) => (
  <Badge tone="muted">Locked · {WAITING_FOR[scoredAgainst(kind)]}</Badge>
);

// A Session's status, the same on every page. The use-cases decide the status; this only words it.
// An Open Session counts down to its Lock, then shows as locked: nothing is published at the Lock yet.
export const SessionStatusBadge = ({
  session: { kind, status, locksAt },
}: {
  session: { kind: SessionKind; status: SessionStatus; locksAt: Date };
}) => {
  switch (status.state) {
    case "open":
      return <LockCountdown locksAt={locksAt.toISOString()} lockedBadge={<LockedBadge kind={kind} />} />;
    case "locked":
      return <LockedBadge kind={kind} />;
    case "scored":
      return <Badge tone="strong">{status.provisional ? "Scored · provisional" : "Scored"}</Badge>;
    case "cancelled":
      return <Badge tone="muted">Cancelled</Badge>;
  }
};
