import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import { type CalendarOutcome, listCalendar } from "./list-calendar";

export const getCurrentCalendar = (playerId: string): Promise<CalendarOutcome> =>
  listCalendar({ db, clock: systemClock }, playerId);
