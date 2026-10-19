import Link from "next/link";
import { signOut } from "../auth/actions";
import type { SignedInPlayer } from "../auth/signed-in-player";
import { Button } from "../ui/button";
import { Menu } from "../ui/menu";
import { HeaderNavigation } from "../ui/navigation";
import { MAIN_SECTIONS } from "./main-sections";

// The app name, the main sections on wide screens, and the Player's menu. The League switcher
// (multiple Leagues, a later spec) goes next to the app name.
export const AppHeader = ({ player, isAppAdmin }: { player: SignedInPlayer; isAppAdmin: boolean }) => (
  <header className="border-b border-border bg-surface">
    <div className="content-column flex items-center justify-between gap-4 py-3">
      <Link href="/" className="text-lg font-bold tracking-wide hover:no-underline">
        F1 Predictor
      </Link>
      <HeaderNavigation links={MAIN_SECTIONS} />
      <Menu label={player.nickname}>
        {isAppAdmin && <Link href="/admin">App Admin</Link>}
        <form action={signOut}>
          <Button type="submit" className="w-full">
            Sign out
          </Button>
        </form>
      </Menu>
    </div>
  </header>
);
