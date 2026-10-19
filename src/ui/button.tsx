import type { ComponentProps } from "react";

const variants = {
  // Red is kept for the one action that matters on a screen.
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "border border-border bg-surface-raised text-text hover:border-text-muted",
};

type ButtonVariant = keyof typeof variants;

export const Button = ({
  variant = "secondary",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) => (
  <button
    className={`rounded-md px-4 py-2 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    {...props}
  />
);
