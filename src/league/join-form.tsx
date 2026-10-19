"use client";

import { useActionState } from "react";
import { Button } from "../ui/button";
import { joinFromForm } from "./actions";

export const JoinForm = () => {
  const [report, formAction, isPending] = useActionState(joinFromForm, null);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1">
        Join Code <input name="joinCode" required autoComplete="off" />
      </label>
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Joining…" : "Join"}
      </Button>
      {report && <p role="alert" className="w-full">{report.message}</p>}
    </form>
  );
};
