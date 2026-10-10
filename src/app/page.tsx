import Link from "next/link";
import { isPlayerAppAdmin } from "../app-admin/signed-in-app-admin";
import { signInWithGoogle, signOut } from "../auth/actions";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { CalendarView } from "../calendar/calendar-view";
import { getCurrentCalendar } from "../calendar/current-calendar";
import { findCurrentMemberLeague } from "../league/current-league";
import { JoinForm } from "../league/join-form";

export default async function HomePage() {
  const player = await getSignedInPlayer();

  if (!player) {
    return (
      <main>
        <h1>F1 Predictor</h1>
        <p>Predict the Top 10 of every F1 Session with your League.</p>
        <form action={signInWithGoogle.bind(null, "/")}>
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const [memberLeague, calendar, isAppAdmin] = await Promise.all([
    findCurrentMemberLeague(player.id),
    getCurrentCalendar(),
    isPlayerAppAdmin(player.id),
  ]);

  return (
    <main>
      <h1>F1 Predictor</h1>
      <form action={signOut}>
        <p>Signed in as {player.nickname}</p>
        <button type="submit">Sign out</button>
      </form>
      {isAppAdmin && <Link href="/admin">App Admin</Link>}
      {memberLeague ? (
        <CalendarView calendar={calendar} />
      ) : (
        <section>
          <h2>Join the League first</h2>
          <p>Open the invite link you received, or type its Join Code here.</p>
          <JoinForm />
        </section>
      )}
    </main>
  );
}
