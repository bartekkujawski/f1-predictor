import Link from "next/link";
import { isPlayerAppAdmin } from "../app-admin/signed-in-app-admin";
import { signOut } from "../auth/actions";
import { SignInWithGoogle } from "../auth/sign-in-with-google";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { CalendarView } from "../calendar/calendar-view";
import { getCurrentCalendar } from "../calendar/current-calendar";
import { JoinForm } from "../league/join-form";

export default async function HomePage() {
  const player = await getSignedInPlayer();

  if (!player) {
    return (
      <main>
        <h1>F1 Predictor</h1>
        <p>Predict the Top 10 of every F1 Session with your League.</p>
        <SignInWithGoogle returnTo="/" />
      </main>
    );
  }

  const [calendarOutcome, isAppAdmin] = await Promise.all([getCurrentCalendar(player.id), isPlayerAppAdmin(player.id)]);

  return (
    <main>
      <h1>F1 Predictor</h1>
      <form action={signOut}>
        <p>Signed in as {player.nickname}</p>
        <button type="submit">Sign out</button>
      </form>
      {isAppAdmin && <Link href="/admin">App Admin</Link>}
      {calendarOutcome.status === "listed" ? (
        <>
          <Link href="/season-table">Season Table</Link>
          <CalendarView calendar={calendarOutcome.calendar} />
        </>
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
