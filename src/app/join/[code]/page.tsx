import { redirect } from "next/navigation";
import { signInWithGoogle } from "../../../auth/actions";
import { getSignedInPlayer } from "../../../auth/signed-in-player";
import { INVALID_JOIN_CODE_MESSAGE, joinCurrentLeague } from "../../../league/current-league";
import { JoinForm } from "../../../league/join-form";

// The invite link. Opening it joins the League, so it works in one click. Joining while the page
// renders is safe only because joining twice has no effect (see joinLeague).
export default async function JoinPage({ params }: PageProps<"/join/[code]">) {
  const { code } = await params;
  const player = await getSignedInPlayer();

  if (!player) {
    // Google sends the Player back to this same link, which then completes the join.
    const signInAndComeBack = signInWithGoogle.bind(null, `/join/${encodeURIComponent(code)}`);
    return (
      <main>
        <h1>Join the League</h1>
        <p>Sign in to join the League you were invited to.</p>
        <form action={signInAndComeBack}>
          <button type="submit">Sign in with Google</button>
        </form>
      </main>
    );
  }

  const outcome = await joinCurrentLeague(player.id, code);
  if (outcome.status === "joined") {
    redirect("/");
  }

  return (
    <main>
      <h1>Join the League</h1>
      <p role="alert">{INVALID_JOIN_CODE_MESSAGE}</p>
      <JoinForm />
    </main>
  );
}
