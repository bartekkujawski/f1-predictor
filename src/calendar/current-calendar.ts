import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import { type Calendar, listCalendar } from "./list-calendar";

export const getCurrentCalendar = (): Promise<Calendar> => listCalendar({ db, clock: systemClock });
