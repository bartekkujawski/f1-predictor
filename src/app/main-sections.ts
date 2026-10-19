import type { NavigationLink } from "../ui/navigation";

// The sections in the main navigation, the same on the bottom bar and in the header.
export const MAIN_SECTIONS: NavigationLink[] = [
  { href: "/", label: "Home" },
  { href: "/rounds", label: "Calendar" },
  { href: "/season-table", label: "Season Table" },
];
