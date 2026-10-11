"use server";

import { revalidatePath } from "next/cache";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { isSessionKind } from "../calendar/session";
import { saveCurrentPrediction } from "./current-prediction";
import type { InvalidPredictionReason } from "./prediction";

export type PredictionFormReport = { message: string } | null;

const INVALID_MESSAGES: Record<InvalidPredictionReason, string> = {
  "not-ten-picks": "Pick a driver for each of the ten positions.",
  "duplicate-driver": "Pick each driver only once.",
  "not-a-regular-driver": "Pick only drivers from the list.",
};

// Behind each Session's Top 10 form. The form is only input: the use-case checks membership,
// the Lock and the Picks again, whatever the page showed.
export const savePredictionFromForm = async (
  _previous: PredictionFormReport,
  form: FormData,
): Promise<PredictionFormReport> => {
  const player = await getSignedInPlayer();
  if (!player) {
    return { message: "Sign in first." };
  }
  const round = Number(form.get("round"));
  const kind = String(form.get("kind"));
  if (!Number.isInteger(round) || !isSessionKind(kind)) {
    return { message: "This Session is not in the calendar." };
  }
  // An unchosen position sends an empty value; leaving it out reports a missing Pick.
  const picks = form.getAll("pick").map(String).filter((pick) => pick !== "");

  const outcome = await saveCurrentPrediction(player.id, { round, kind, picks });
  switch (outcome.status) {
    case "not-a-member":
      return { message: "Join the League first." };
    case "no-such-session":
      return { message: "This Session is not in the calendar." };
    case "locked":
      return { message: "This Session has locked. Your saved Prediction stays as it was." };
    case "invalid":
      return { message: INVALID_MESSAGES[outcome.reason] };
    case "saved":
      revalidatePath(`/rounds/${round}`);
      return { message: "Saved." };
  }
};
