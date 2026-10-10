import { notFound } from "next/navigation";
import { isPlayerAppAdmin } from "../../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { CopyButton } from "../../league/copy-button";
import { CreateLeagueForm } from "../../league/create-league-form";
import { getCurrentLeagueJoinCode, inviteLink } from "../../league/current-league";
import type { LeagueJoinCode } from "../../league/league";
import { RefreshForm } from "../../refresh/refresh-form";

const LeagueJoinCodeView = ({ league }: { league: LeagueJoinCode }) => {
  const link = inviteLink(league.joinCode);
  return (
    <>
      <p>{league.name}</p>
      <p>
        Join Code: <code>{league.joinCode}</code>
      </p>
      <p>
        Invite link: <code>{link}</code> <CopyButton text={link} />
      </p>
    </>
  );
};

export default async function AdminPage() {
  const player = await getSignedInPlayer();
  if (!player || !(await isPlayerAppAdmin(player.id))) {
    notFound();
  }
  const found = await getCurrentLeagueJoinCode(player.id);

  return (
    <main>
      <h1>App Admin</h1>
      <section>
        <h2>League</h2>
        {found.status === "found" ? (
          <LeagueJoinCodeView league={found.league} />
        ) : (
          <CreateLeagueForm />
        )}
      </section>
      <section>
        <h2>Calendar</h2>
        <p>Sync the current Season&apos;s schedule and Regular Drivers from Jolpica.</p>
        <RefreshForm />
      </section>
    </main>
  );
}
