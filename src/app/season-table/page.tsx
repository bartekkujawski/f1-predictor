import Link from "next/link";
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
      <Link href="/">F1 Predictor</Link>
      <h1>Season Table</h1>
      <table>
        <thead>
          <tr>
            <th scope="col">Position</th>
            <th scope="col">Member</th>
            <th scope="col">Points</th>
            <th scope="col">Exact Hits</th>
          </tr>
        </thead>
        <tbody>
          {/* Nicknames need not be unique, and the table never reorders, so the index is the key. */}
          {outcome.table.map(({ position, nickname, totalPoints, exactHits }, index) => (
            <tr key={index}>
              <td>{position}</td>
              <td>{nickname}</td>
              <td>{totalPoints}</td>
              <td>{exactHits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
