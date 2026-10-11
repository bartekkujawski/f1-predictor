"use client";

import { useActionState, useState } from "react";
import { savePredictionFromForm } from "./actions";
import type { RegularDriver } from "../results-source/results-source";
import type { RoundSession } from "./prediction";

const POSITIONS = Array.from({ length: 10 }, (_, index) => index + 1);

// The Top 10 of one open Session. The selects are controlled, so a refused save keeps what the
// Member chose instead of resetting the form.
export const PredictionForm = ({
  round,
  session,
  regularDrivers,
}: {
  round: number;
  session: RoundSession;
  regularDrivers: RegularDriver[];
}) => {
  const [report, formAction, isPending] = useActionState(savePredictionFromForm, null);
  const [picks, setPicks] = useState<string[]>(() => POSITIONS.map((position) => session.prediction?.[position - 1] ?? ""));

  const choose = (index: number, driverId: string) =>
    setPicks((current) => current.map((pick, other) => (other === index ? driverId : pick)));

  return (
    <form action={formAction}>
      <input type="hidden" name="round" value={round} />
      <input type="hidden" name="kind" value={session.kind} />
      <ol>
        {POSITIONS.map((position, index) => (
          <li key={position}>
            <label>
              P{position}{" "}
              <select name="pick" value={picks[index]} onChange={(event) => choose(index, event.target.value)}>
                <option value="">Choose a driver</option>
                {regularDrivers.map((driver) => (
                  // A driver already picked at another position cannot be picked again.
                  <option
                    key={driver.driverId}
                    value={driver.driverId}
                    disabled={picks.includes(driver.driverId) && picks[index] !== driver.driverId}
                  >
                    {driver.name} ({driver.code})
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ol>
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving…" : `Save ${session.kind} Prediction`}
      </button>
      {report && <p role="status">{report.message}</p>}
    </form>
  );
};
