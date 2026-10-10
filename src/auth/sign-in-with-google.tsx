import { signInWithGoogle } from "./actions";

// The sign-in button. Google sends the Player back to returnTo, e.g. the invite link they opened.
export const SignInWithGoogle = ({ returnTo }: { returnTo: string }) => (
  <form action={signInWithGoogle.bind(null, returnTo)}>
    <button type="submit">Sign in with Google</button>
  </form>
);
