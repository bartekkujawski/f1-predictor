import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedInPlayer } from "../../../../auth/signed-in-player";
import { scoredAgainst, type SessionKind, type SessionStatus } from "../../../../calendar/session";
import { getCurrentSessionPredictions } from "../../../../prediction/current-prediction";
import SessionPage from "./page";

// The page reads the session and the Session's Predictions through these modules, which need a real
// request and database. Here the test decides what they answer.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("../../../../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../../../../prediction/current-prediction", () => ({ getCurrentSessionPredictions: vi.fn() }));

const ania = { id: "player-ania", nickname: "Anna Nowak" };

// The page's text without its markup, as a reader sees it.
const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// The given Session of Round 1 with nobody's Prediction, as the use-case returns it for the status.
const sessionWith = (kind: SessionKind, status: SessionStatus) => {
  vi.mocked(getCurrentSessionPredictions).mockResolvedValue({
    status: "found",
    session: {
      round: { number: 1, name: "Australian Grand Prix" },
      kind,
      locksAt: new Date("2026-03-07T05:00:00Z"),
      status,
      visible: status.state === "open" ? { state: "open", own: null } : { state: "locked", members: [] },
      regularDrivers: [],
      scoredAgainst: scoredAgainst(kind),
      top10: status.state === "scored" ? [] : null,
    },
  });
};

const renderSessionPage = async (kind: SessionKind): Promise<string> =>
  renderToStaticMarkup(
    await SessionPage({ params: Promise.resolve({ number: "1", kind }), searchParams: Promise.resolve({}) }),
  );

describe("SessionPage", () => {
  beforeEach(() => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);
  });

  it.each([
    { status: { state: "open" }, kind: "Race", badge: "Open" },
    { status: { state: "locked" }, kind: "Race", badge: "Locked · waiting for results" },
    { status: { state: "locked" }, kind: "Qualifying", badge: "Locked · waiting for the Starting Grid" },
    { status: { state: "scored", provisional: true }, kind: "Race", badge: "Scored · provisional" },
    { status: { state: "cancelled" }, kind: "Race", badge: "Cancelled" },
  ] as const)("shows a $kind with status $status.state as \"$badge\"", async ({ status, kind, badge }) => {
    sessionWith(kind, status);

    expect(textOf(await renderSessionPage(kind))).toContain(badge);
  });

  it("shows a Session scored in a Final Round as scored, without \"provisional\"", async () => {
    sessionWith("Race", { state: "scored", provisional: false });

    const text = textOf(await renderSessionPage("Race"));

    expect(text).toContain("Scored");
    expect(text).not.toContain("provisional");
  });
});
