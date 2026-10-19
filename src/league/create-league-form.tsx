"use client";

import { useActionState } from "react";
import { Button } from "../ui/button";
import { createLeagueFromForm } from "./actions";

export const CreateLeagueForm = () => {
  const [report, formAction, isPending] = useActionState(createLeagueFromForm, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        League name <input name="name" required />
      </label>
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Creating…" : "Create the League"}
      </Button>
      {report && <p role="alert" className="w-full">{report.message}</p>}
    </form>
  );
};
