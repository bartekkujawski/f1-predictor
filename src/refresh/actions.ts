"use server";

import { DrizzleQueryError } from "drizzle-orm/errors";
import { revalidatePath } from "next/cache";
import { appAdminEmails } from "../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import { createJolpicaResultsSource } from "../results-source/jolpica";
import { refresh, type SessionRef } from "./refresh";

// One line per part of the report.
export type RefreshReport = { lines: string[] } | null;

const describeSessions = (sessions: SessionRef[]): string =>
  sessions.length === 0 ? "none" : sessions.map(({ round, kind }) => `Round ${round} ${kind}`).join(", ");

// Drizzle's message is the whole failed query; the database's own reason is in error.cause.
const describeError = (error: unknown): string => {
  if (error instanceof DrizzleQueryError && error.cause instanceof Error) {
    return error.cause.message;
  }
  return error instanceof Error ? error.message : String(error);
};

// Behind the App Admin's refresh button. The use-case decides whether the Player may refresh.
export const refreshFromJolpica = async (): Promise<RefreshReport> => {
  const player = await getSignedInPlayer();
  if (!player) {
    return { lines: ["Sign in first."] };
  }
  try {
    const outcome = await refresh(
      { db, resultsSource: createJolpicaResultsSource(), clock: systemClock, appAdminEmails },
      player.id,
    );
    if (outcome.status === "refused") {
      return { lines: ["Only the App Admin can refresh."] };
    }
    revalidatePath("/");
    const { season, calendar, updated, unchanged, waiting, errors } = outcome;
    return {
      lines: [
        // Without the calendar, the error below says why.
        ...(calendar
          ? [`Synced Season ${season}: ${calendar.rounds} Rounds and ${calendar.regularDrivers} Regular Drivers.`]
          : []),
        `Results updated: ${describeSessions(updated)}.`,
        `Results unchanged: ${describeSessions(unchanged)}.`,
        `Still waiting for results: ${describeSessions(waiting)}.`,
        // Jolpica may be down or rate-limiting; the App Admin can simply try again.
        ...errors.map((error) => `Error: ${error}`),
      ],
    };
  } catch (error) {
    // A database failure; Jolpica's failures are in the report above.
    return { lines: [`Refresh failed: ${describeError(error)}`] };
  }
};
