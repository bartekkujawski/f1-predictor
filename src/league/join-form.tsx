"use client";

import { useActionState } from "react";
import { joinFromForm } from "./actions";

export const JoinForm = () => {
  const [report, formAction, isPending] = useActionState(joinFromForm, null);
  return (
    <form action={formAction}>
      <label>
        Join Code <input name="joinCode" required autoComplete="off" />
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? "Joining…" : "Join"}
      </button>
      {report && <p role="alert">{report.message}</p>}
    </form>
  );
};
