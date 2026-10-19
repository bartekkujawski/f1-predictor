import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { getCurrentCalendar } from "../calendar/current-calendar";
import type { Calendar } from "../calendar/list-calendar";
import HomePage from "./page";

// The page reads the session and the calendar through these modules, which
// need a real request and database. Here the test decides what they answer.
vi.mock("../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../auth/actions", () => ({ signInWithGoogle: vi.fn() }));
vi.mock("../calendar/current-calendar", () => ({ getCurrentCalendar: vi.fn() }));
vi.mock("../league/actions", () => ({ joinFromForm: vi.fn() }));

const ania = { id: "player-ania", nickname: "Anna Nowak" };

// Home shows the calendar for now; the Calendar page's own test covers how it renders.
const calendar: Calendar = {
  season: 2026,
  nextOpenRound: 2,
  rounds: [{ number: 2, name: "Bahrain Grand Prix", sessions: [] }],
};

const renderHomePage = async (): Promise<string> => renderToStaticMarkup(await HomePage());

describe("HomePage", () => {
  beforeEach(() => {
    vi.mocked(getCurrentCalendar).mockResolvedValue({ status: "listed", calendar });
  });

  it("renders the app name as the main heading", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    expect(await renderHomePage()).toMatch(/<h1[^>]*>F1 Predictor<\/h1>/);
  });

  it("offers sign-in with Google when nobody is signed in, and no calendar", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    const html = await renderHomePage();

    expect(html).toContain("Sign in with Google");
    expect(html).not.toContain("Bahrain Grand Prix");
  });

  it("shows the calendar until Home gets its own content", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);

    expect(await renderHomePage()).toContain("Round 2: Bahrain Grand Prix");
  });

  it("asks a Player who is not a Member to join first, instead of showing the calendar", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);
    vi.mocked(getCurrentCalendar).mockResolvedValue({ status: "not-a-member" });

    const html = await renderHomePage();

    expect(html).toContain("Join the League first");
    expect(html).toContain('name="joinCode"');
    expect(html).not.toContain("Bahrain Grand Prix");
  });
});
