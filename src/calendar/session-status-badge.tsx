import { Badge } from "../ui/badge";
import { type ScoredAgainst, scoredAgainst, type SessionKind, type SessionStatus } from "./session";

// What a locked Session waits for. The Starting Grid comes with the Race results (ADR-0008).
const WAITING_FOR: Record<ScoredAgainst, string> = {
  "Starting Grid": "waiting for the Starting Grid",
  "Official Classification": "waiting for results",
};

// A Session's status, the same on every page. The use-cases decide the status; this only words it.
export const SessionStatusBadge = ({ kind, status }: { kind: SessionKind; status: SessionStatus }) => {
  switch (status.state) {
    case "open":
      return <Badge tone="accent">Open</Badge>;
    case "locked":
      return <Badge tone="muted">Locked · {WAITING_FOR[scoredAgainst(kind)]}</Badge>;
    case "scored":
      return <Badge tone="strong">{status.provisional ? "Scored · provisional" : "Scored"}</Badge>;
    case "cancelled":
      return <Badge tone="muted">Cancelled</Badge>;
  }
};
