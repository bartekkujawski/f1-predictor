import { SignInWithGoogle } from "../auth/sign-in-with-google";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { CalendarView } from "../calendar/calendar-view";
import { getCurrentCalendar } from "../calendar/current-calendar";
import { JoinForm } from "../league/join-form";
import { Card } from "../ui/card";

export default async function HomePage() {
  const player = await getSignedInPlayer();

  if (!player) {
    return (
      <main className="space-y-4">
        <h1 className="text-3xl font-bold">F1 Predictor</h1>
        <p className="text-text-muted">Predict the Top 10 of every F1 Session with your League.</p>
        <SignInWithGoogle returnTo="/" />
      </main>
    );
  }

  const calendarOutcome = await getCurrentCalendar(player.id);

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Home</h1>
      {calendarOutcome.status === "listed" ? (
        <CalendarView calendar={calendarOutcome.calendar} />
      ) : (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Join the League first</h2>
          <p className="text-text-muted">Open the invite link you received, or type its Join Code here.</p>
          <JoinForm />
        </Card>
      )}
    </main>
  );
}
