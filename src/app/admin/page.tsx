import { notFound } from "next/navigation";
import { isPlayerAppAdmin } from "../../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { RefreshForm } from "../../refresh/refresh-form";

export default async function AdminPage() {
  const player = await getSignedInPlayer();
  if (!player || !(await isPlayerAppAdmin(player.id))) {
    notFound();
  }

  return (
    <main>
      <h1>App Admin</h1>
      <p>Sync the current Season&apos;s schedule and Regular Drivers from Jolpica.</p>
      <RefreshForm />
    </main>
  );
}
