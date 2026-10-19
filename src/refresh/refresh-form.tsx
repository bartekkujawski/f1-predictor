"use client";

import { useActionState } from "react";
import { Button } from "../ui/button";
import { refreshFromJolpica } from "./actions";

export const RefreshForm = () => {
  const [report, formAction, isPending] = useActionState(refreshFromJolpica, null);
  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" variant="primary" disabled={isPending}>
        {isPending ? "Refreshing…" : "Refresh from Jolpica"}
      </Button>
      {report && (
        <div role="status" className="text-sm text-text-muted">
          {report.lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}
    </form>
  );
};
