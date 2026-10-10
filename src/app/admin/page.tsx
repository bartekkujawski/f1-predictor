import { notFound } from "next/navigation";
import { isPlayerAppAdmin } from "../../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { CopyButton } from "../../league/copy-button";
import { CreateLeagueForm } from "../../league/create-league-form";
import { getCurrentLeagueInvite, inviteLink } from "../../league/current-league";
import { RefreshForm } from "../../refresh/refresh-form";

export default async function AdminPage() {
  const player = await getSignedInPlayer();
  if (!player || !(await isPlayerAppAdmin(player.id))) {
    notFound();
  }
  const invite = await getCurrentLeagueInvite(player.id);

  return (
    <main>
      <h1>App Admin</h1>
      <section>
        <h2>League</h2>
        {invite.status === "found" ? (
          <>
            <p>{invite.league.name}</p>
            <p>
              Join Code: <code>{invite.league.joinCode}</code>
            </p>
            <p>
              Invite link: <code>{inviteLink(invite.league.joinCode)}</code>{" "}
              <CopyButton text={inviteLink(invite.league.joinCode)} />
            </p>
          </>
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
