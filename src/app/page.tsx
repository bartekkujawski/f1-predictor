import { signInWithGoogle, signOut } from "../auth/actions";
import { getSignedInPlayer } from "../auth/signed-in-player";

export default async function HomePage() {
  const player = await getSignedInPlayer();

  return (
    <main>
      <h1>F1 Predictor</h1>
      <p>Predict the Top 10 of every F1 Session with your League. Coming soon.</p>
      {player ? (
        <form action={signOut}>
          <p>Signed in as {player.nickname}</p>
          <button type="submit">Sign out</button>
        </form>
      ) : (
        <form action={signInWithGoogle}>
          <button type="submit">Sign in with Google</button>
        </form>
      )}
    </main>
  );
}
