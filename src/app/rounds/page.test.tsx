import { redirect } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { getCurrentCalendar } from "../../calendar/current-calendar";
import type { Calendar } from "../../calendar/list-calendar";
import type { SessionStatus } from "../../calendar/session";
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

const session = (kind: "Qualifying" | "Race", startsAt: string, locksAt: string, status: SessionStatus) => ({
  kind,
  startsAt: new Date(startsAt),
  locksAt: new Date(locksAt),
  status,
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
        session("Qualifying", "2026-02-28T05:00:00Z", "2026-02-28T05:00:00Z", { state: "locked" }),
        session("Race", "2026-03-01T04:00:00Z", "2026-02-28T05:00:00Z", { state: "locked" }),
      ],
    },
    {
      number: 2,
      name: "Bahrain Grand Prix",
      sessions: [
        session("Qualifying", qualifyingStart, qualifyingStart, { state: "open" }),
        session("Race", "2026-03-08T15:00:00Z", qualifyingStart, { state: "open" }),
      ],
    },
  ],
};

const renderCalendarPage = async (): Promise<string> => renderToStaticMarkup(await CalendarPage());

// The page's text without its markup, as a reader sees it.
const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

// A calendar of one Round with only the given Session.
const calendarWith = (kind: "Qualifying" | "Race", status: SessionStatus): Calendar => ({
  season: 2026,
  nextOpenRound: null,
  rounds: [{ number: 1, name: "Australian Grand Prix", sessions: [session(kind, qualifyingStart, qualifyingStart, status)] }],
});

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);
    vi.mocked(getCurrentCalendar).mockResolvedValue({ status: "listed", calendar });
  });

  it("shows every Round with its Sessions and their Lock times", async () => {
    const html = await renderCalendarPage();

    expect(html).toContain("Round 1: Australian Grand Prix");
    expect(html).toContain(`<time dateTime="${qualifyingStart}">`);
  });

  it.each([
    { status: { state: "open" }, kind: "Race", badge: "Open" },
    { status: { state: "locked" }, kind: "Race", badge: "Locked · waiting for results" },
    { status: { state: "locked" }, kind: "Qualifying", badge: "Locked · waiting for the Starting Grid" },
    { status: { state: "scored", provisional: true }, kind: "Race", badge: "Scored · provisional" },
    { status: { state: "cancelled" }, kind: "Race", badge: "Cancelled" },
  ] as const)("shows a $kind with status $status.state as \"$badge\"", async ({ status, kind, badge }) => {
    vi.mocked(getCurrentCalendar).mockResolvedValue({ status: "listed", calendar: calendarWith(kind, status) });

    expect(textOf(await renderCalendarPage())).toContain(badge);
  });

  it("shows a Session scored in a Final Round as scored, without \"provisional\"", async () => {
    vi.mocked(getCurrentCalendar).mockResolvedValue({
      status: "listed",
      calendar: calendarWith("Race", { state: "scored", provisional: false }),
    });

    const text = textOf(await renderCalendarPage());

    expect(text).toContain("Scored");
    expect(text).not.toContain("provisional");
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
