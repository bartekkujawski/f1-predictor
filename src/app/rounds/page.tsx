import { redirect } from "next/navigation";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { CalendarView } from "../../calendar/calendar-view";
import { getCurrentCalendar } from "../../calendar/current-calendar";

// The current Season's Rounds, each leading to its Round page.
export default async function CalendarPage() {
  const player = await getSignedInPlayer();
  if (!player) {
    redirect("/");
  }
  const outcome = await getCurrentCalendar(player.id);
  if (outcome.status === "not-a-member") {
    // The home page asks the Player to join first.
    redirect("/");
  }

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Calendar</h1>
      <CalendarView calendar={outcome.calendar} />
    </main>
  );
}
