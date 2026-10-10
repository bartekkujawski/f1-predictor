import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPlayerAppAdmin } from "../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { getCurrentCalendar } from "../calendar/current-calendar";
import type { Calendar } from "../calendar/list-calendar";
import HomePage from "./page";

// The page reads the session, the calendar and the App Admin role through these modules, which
// need a real request and database. Here the test decides what they answer.
vi.mock("../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../auth/actions", () => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }));
vi.mock("../calendar/current-calendar", () => ({ getCurrentCalendar: vi.fn() }));
vi.mock("../app-admin/signed-in-app-admin", () => ({ isPlayerAppAdmin: vi.fn() }));

const ania = { id: "player-ania", nickname: "Anna Nowak" };

const session = (kind: "Qualifying" | "Race", startsAt: string, locksAt: string, state: "open" | "locked") => ({
  kind,
  startsAt: new Date(startsAt),
  locksAt: new Date(locksAt),
  state,
});

const qualifyingStart = "2026-03-07T15:00:00.000Z";

const calendar: Calendar = {
  season: 2026,
  nextOpenRound: 2,
  rounds: [
    {
      number: 1,
      name: "Australian Grand Prix",
      sessions: [
        session("Qualifying", "2026-02-28T05:00:00Z", "2026-02-28T05:00:00Z", "locked"),
        session("Race", "2026-03-01T04:00:00Z", "2026-02-28T05:00:00Z", "locked"),
      ],
    },
    {
      number: 2,
      name: "Bahrain Grand Prix",
      sessions: [
        session("Qualifying", qualifyingStart, qualifyingStart, "open"),
        session("Race", "2026-03-08T15:00:00Z", qualifyingStart, "open"),
      ],
    },
  ],
};

const renderHomePage = async (): Promise<string> => renderToStaticMarkup(await HomePage());

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(getCurrentCalendar).mockResolvedValue(calendar);
    vi.mocked(isPlayerAppAdmin).mockResolvedValue(false);
  });

  it("renders the app name as the main heading", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    expect(await renderHomePage()).toContain("<h1>F1 Predictor</h1>");
  });

  it("offers sign-in with Google when nobody is signed in, and no calendar", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    const html = await renderHomePage();

    expect(html).toContain("Sign in with Google");
    expect(html).not.toContain("Sign out");
    expect(html).not.toContain("Bahrain Grand Prix");
  });

  it("shows the signed-in Player's nickname and a sign-out button", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);

    const html = await renderHomePage();

    expect(html).toContain("Anna Nowak");
    expect(html).toContain("Sign out");
    expect(html).not.toContain("Sign in with Google");
  });

  it("shows the calendar with each Session's state and Lock time", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);

    const html = await renderHomePage();

    expect(html).toContain("Round 1: Australian Grand Prix");
    expect(html).toContain("Qualifying: locked");
    expect(html).toContain("Race: open");
    expect(html).toContain(`<time dateTime="${qualifyingStart}">`);
  });

  it("highlights the next open Round", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);

    const html = await renderHomePage();

    expect(html).toMatch(/aria-current="true"><h3>Round 2: Bahrain Grand Prix/);
  });

  it("links to the App Admin page only for the App Admin", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);
    expect(await renderHomePage()).not.toContain('href="/admin"');

    vi.mocked(isPlayerAppAdmin).mockResolvedValue(true);
    expect(await renderHomePage()).toContain('href="/admin"');
  });
});
