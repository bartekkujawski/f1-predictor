import { redirect } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { getCurrentCalendar } from "../../calendar/current-calendar";
import type { Calendar } from "../../calendar/list-calendar";
import CalendarPage from "./page";

// The page reads the session and the calendar through these modules, which need a real request and
// database. Here the test decides what they answer. Like Next.js, redirect ends the render by throwing.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("../../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../../calendar/current-calendar", () => ({ getCurrentCalendar: vi.fn() }));

const ania = { id: "player-ania", nickname: "Anna Nowak" };

const session = (kind: "Qualifying" | "Race", startsAt: string, locksAt: string, state: "open" | "locked") => ({
  kind,
  startsAt: new Date(startsAt),
  locksAt: new Date(locksAt),
  status: { state },
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

const renderCalendarPage = async (): Promise<string> => renderToStaticMarkup(await CalendarPage());

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);
    vi.mocked(getCurrentCalendar).mockResolvedValue({ status: "listed", calendar });
  });

  it("shows every Round with each Session's state and Lock time", async () => {
    const html = await renderCalendarPage();

    expect(html).toContain("Round 1: Australian Grand Prix");
    expect(html).toContain("Qualifying: locked");
    expect(html).toContain("Race: open");
    expect(html).toContain(`<time dateTime="${qualifyingStart}">`);
  });

  it("highlights the next open Round and links to it", async () => {
    const html = await renderCalendarPage();

    expect(html).toMatch(/<article aria-current="true"[^>]*>.*?<a [^>]*href="\/rounds\/2"[^>]*>Round 2: Bahrain Grand Prix/);
  });

  it("says when the calendar has not been synced yet", async () => {
    vi.mocked(getCurrentCalendar).mockResolvedValue({
      status: "listed",
      calendar: { season: 2026, rounds: [], nextOpenRound: null },
    });

    expect(await renderCalendarPage()).toContain("The calendar has not been synced yet.");
  });

  it("sends a Player who is not a Member Home, where they are asked to join", async () => {
    vi.mocked(getCurrentCalendar).mockResolvedValue({ status: "not-a-member" });

    await expect(renderCalendarPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });

  it("sends a signed-out visitor Home", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    await expect(renderCalendarPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
