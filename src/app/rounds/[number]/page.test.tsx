import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedInPlayer } from "../../../auth/signed-in-player";
import type { SessionKind, SessionStatus } from "../../../calendar/session";
import { getCurrentPlayerPredictions } from "../../../prediction/current-prediction";
import RoundPage from "./page";

// The page reads the session and the Round through these modules, which need a real request and
// database. Here the test decides what they answer.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("../../../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../../../prediction/current-prediction", () => ({ getCurrentPlayerPredictions: vi.fn() }));
vi.mock("../../../prediction/actions", () => ({ savePredictionFromForm: vi.fn() }));

const ania = { id: "player-ania", nickname: "Anna Nowak" };

const renderRoundPage = async (): Promise<string> =>
  renderToStaticMarkup(
    await RoundPage({ params: Promise.resolve({ number: "1" }), searchParams: Promise.resolve({}) }),
  );

// The page's text without its markup, as a reader sees it.
const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// Round 1 with only the given Session, which Ania has not predicted.
const roundWith = (kind: SessionKind, status: SessionStatus) => {
  vi.mocked(getCurrentPlayerPredictions).mockResolvedValue({
    status: "found",
    round: {
      number: 1,
      name: "Australian Grand Prix",
      sessions: [{ kind, locksAt: new Date("2026-03-07T05:00:00Z"), status, prediction: null }],
      regularDrivers: [],
    },
  });
};

describe("RoundPage", () => {
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
    roundWith(kind, status);

    expect(textOf(await renderRoundPage())).toContain(badge);
  });

  it("shows a Session scored in a Final Round as scored, without \"provisional\"", async () => {
    roundWith("Race", { state: "scored", provisional: false });

    const text = textOf(await renderRoundPage());

    expect(text).toContain("Scored");
    expect(text).not.toContain("provisional");
  });
});
