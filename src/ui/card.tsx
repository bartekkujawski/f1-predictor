import type { ComponentProps } from "react";

export const Card = ({ className = "", ...props }: ComponentProps<"section">) => (
  <section className={`rounded-lg border border-border bg-surface p-4 ${className}`} {...props} />
);
