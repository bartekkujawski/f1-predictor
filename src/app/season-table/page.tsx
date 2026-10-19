import { redirect } from "next/navigation";
import { getSignedInPlayer } from "../../auth/signed-in-player";
import { getCurrentSeasonTable } from "../../league/current-league";

// The League's Season Table: every Member ranked by total Session Scores, ties broken by Exact Hits.
export default async function SeasonTablePage() {
  const player = await getSignedInPlayer();
  if (!player) {
    redirect("/");
  }
  const outcome = await getCurrentSeasonTable(player.id);
  if (outcome.status === "not-a-member") {
    // The home page asks the Player to join first.
    redirect("/");
  }

  return (
    <main>
      <h1 className="mb-4 text-2xl font-bold">Season Table</h1>
      <table className="w-full overflow-hidden rounded-lg bg-surface">
        <thead className="text-left text-sm text-text-muted">
          <tr>
            <th scope="col" className="p-3">
              Position
            </th>
            <th scope="col" className="p-3">
              Member
            </th>
            <th scope="col" className="p-3 text-right">
              Points
            </th>
            <th scope="col" className="p-3 text-right">
              Exact Hits
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Nicknames need not be unique, and the table never reorders, so the index is the key. */}
          {outcome.table.map(({ position, nickname, totalPoints, exactHits }, index) => (
            <tr key={index} className="border-t border-border tabular-nums">
              <td className="p-3">{position}</td>
              <td className="p-3">{nickname}</td>
              <td className="p-3 text-right font-semibold">{totalPoints}</td>
              <td className="p-3 text-right">{exactHits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
