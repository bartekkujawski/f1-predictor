"use server";

import { DrizzleQueryError } from "drizzle-orm/errors";
import { revalidatePath } from "next/cache";
import { appAdminEmails } from "../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { systemClock } from "../clock/clock";
import { db } from "../db/database";
import { createJolpicaResultsSource } from "../results-source/jolpica";
import { refresh } from "./refresh";

export type RefreshReport = { message: string } | null;

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
    return { message: "Sign in first." };
  }
  try {
    const outcome = await refresh(
      { db, resultsSource: createJolpicaResultsSource(), clock: systemClock, appAdminEmails },
      player.id,
    );
    if (outcome.status === "refused") {
      return { message: "Only the App Admin can refresh." };
    }
    revalidatePath("/");
    const { season, rounds, regularDrivers } = outcome;
    return { message: `Synced Season ${season}: ${rounds} Rounds and ${regularDrivers} Regular Drivers.` };
  } catch (error) {
    // Jolpica may be down or rate-limiting; the App Admin can simply try again.
    return { message: `Refresh failed: ${describeError(error)}` };
  }
};
