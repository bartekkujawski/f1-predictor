import type { ComponentProps } from "react";

// A plain box, so it can sit inside any section or list without adding a landmark of its own.
export const Card = ({ className = "", ...props }: ComponentProps<"div">) => (
  <div className={`rounded-lg border border-border bg-surface p-4 ${className}`} {...props} />
);
