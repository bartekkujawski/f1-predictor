"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// A dropdown that works without JavaScript (<details>). The layout survives a navigation, so the
// key remounts the menu on a new path, which closes it after the Player follows one of its links.
export const Menu = ({ label, children }: { label: ReactNode; children: ReactNode }) => {
  const pathname = usePathname();
  return (
    <details key={pathname} className="relative">
      <summary className="cursor-pointer list-none rounded-md px-2 py-1 hover:bg-surface-raised">{label}</summary>
      <div className="absolute right-0 z-10 mt-2 flex min-w-48 flex-col gap-2 rounded-lg border border-border bg-surface-raised p-3 shadow-lg">
        {children}
      </div>
    </details>
  );
};
