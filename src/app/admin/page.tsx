import { notFound } from "next/navigation";
import { isPlayerAppAdmin } from "../../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { CopyButton } from "../../league/copy-button";
import { CreateLeagueForm } from "../../league/create-league-form";
import { getCurrentLeagueJoinCode, inviteLink } from "../../league/current-league";
import type { LeagueJoinCode } from "../../league/league";
import { RefreshForm } from "../../refresh/refresh-form";
import { Card } from "../../ui/card";

const LeagueJoinCodeView = ({ league }: { league: LeagueJoinCode }) => {
  const link = inviteLink(league.joinCode);
  return (
    <div className="space-y-2">
      <p className="font-semibold">{league.name}</p>
      <p>
        Join Code: <code className="tabular-nums">{league.joinCode}</code>
      </p>
      <p className="flex flex-wrap items-center gap-2">
        Invite link: <code className="break-all">{link}</code> <CopyButton text={link} />
      </p>
    </div>
  );
};

export default async function AdminPage() {
  const player = await getSignedInPlayer();
  if (!player || !(await isPlayerAppAdmin(player.id))) {
    notFound();
  }
  const found = await getCurrentLeagueJoinCode(player.id);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">App Admin</h1>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">League</h2>
        {found.status === "found" ? (
          <LeagueJoinCodeView league={found.league} />
        ) : (
          <CreateLeagueForm />
        )}
      </Card>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Calendar and results</h2>
        <p className="text-text-muted">
          Sync the current Season&apos;s schedule, Regular Drivers and results from Jolpica. Rounds that are
          already final are left as they are.
        </p>
        <RefreshForm />
      </Card>
    </main>
  );
}
