"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { appAdminEmails } from "../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { db } from "../db/database";
import { createLeague, joinLeague } from "./league";

export type LeagueFormReport = { message: string } | null;

// Behind the App Admin's create form. The use-case decides whether the Player may create it.
export const createLeagueFromForm = async (_previous: LeagueFormReport, form: FormData): Promise<LeagueFormReport> => {
  const player = await getSignedInPlayer();
  if (!player) {
    return { message: "Sign in first." };
  }
  const outcome = await createLeague({ db, appAdminEmails }, player.id, String(form.get("name") ?? ""));
  if (outcome.status === "refused") {
    return { message: "Only the App Admin can create the League." };
  }
  if (outcome.status === "invalid-name") {
    return { message: "Give the League a name." };
  }
  revalidatePath("/admin");
  return null;
};

// Behind the form where a Player types a Join Code by hand.
export const joinFromForm = async (_previous: LeagueFormReport, form: FormData): Promise<LeagueFormReport> => {
  const player = await getSignedInPlayer();
  if (!player) {
    return { message: "Sign in first." };
  }
  const outcome = await joinLeague({ db }, player.id, String(form.get("joinCode") ?? ""));
  if (outcome.status === "invalid-code") {
    return { message: "This Join Code does not match any League. Check it, or ask for a new invite." };
  }
  redirect("/");
};
