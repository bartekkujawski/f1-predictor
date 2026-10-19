import { Button } from "../ui/button";
import { signInWithGoogle } from "./actions";

// The sign-in button. Google sends the Player back to returnTo, e.g. the invite link they opened.
export const SignInWithGoogle = ({ returnTo }: { returnTo: string }) => (
  <form action={signInWithGoogle.bind(null, returnTo)}>
    <Button type="submit" variant="primary">
      Sign in with Google
    </Button>
  </form>
);
