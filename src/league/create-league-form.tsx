"use client";

import { useActionState } from "react";
import { createLeagueFromForm } from "./actions";

export const CreateLeagueForm = () => {
  const [report, formAction, isPending] = useActionState(createLeagueFromForm, null);
  return (
    <form action={formAction}>
      <label>
        League name <input name="name" required />
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create the League"}
      </button>
      {report && <p role="alert">{report.message}</p>}
    </form>
  );
};
