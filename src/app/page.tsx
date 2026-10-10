import Link from "next/link";
import { isPlayerAppAdmin } from "../app-admin/signed-in-app-admin";
import { signInWithGoogle, signOut } from "../auth/actions";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { CalendarView } from "../calendar/calendar-view";
import { getCurrentCalendar } from "../calendar/current-calendar";

export default async function HomePage() {
  const player = await getSignedInPlayer();

  if (!player) {
    return (
      <main>
        <h1>F1 Predictor</h1>
        <p>Predict the Top 10 of every F1 Session with your League.</p>
        <form action={signInWithGoogle}>
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const [calendar, isAppAdmin] = await Promise.all([getCurrentCalendar(), isPlayerAppAdmin(player.id)]);

  return (
    <main>
      <h1>F1 Predictor</h1>
      <form action={signOut}>
        <p>Signed in as {player.nickname}</p>
        <button type="submit">Sign out</button>
      </form>
      {isAppAdmin && <Link href="/admin">App Admin</Link>}
      <CalendarView calendar={calendar} />
    </main>
  );
}
