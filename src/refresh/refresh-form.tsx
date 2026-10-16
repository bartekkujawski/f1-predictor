"use client";

import { useActionState } from "react";
import { refreshFromJolpica } from "./actions";

export const RefreshForm = () => {
  const [report, formAction, isPending] = useActionState(refreshFromJolpica, null);
  return (
    <form action={formAction}>
      <button type="submit" disabled={isPending}>
        {isPending ? "Refreshing…" : "Refresh from Jolpica"}
      </button>
      {report && (
        <div role="status">
          {report.lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      )}
    </form>
  );
};
