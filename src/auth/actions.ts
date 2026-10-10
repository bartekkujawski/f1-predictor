"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

// Server actions behind the sign-in and sign-out buttons. The nextCookies plugin
// sets and clears the cookies Better Auth returns.

// Only a path on this site, so a crafted form cannot send the Player elsewhere after Google
// ("//host" and "/\\host" are other sites to a browser).
const isPathOnThisSite = (path: string): boolean => /^\/(?![/\\])/.test(path);

// Bind it to the page to come back to after Google, e.g. the invite link the Player opened:
// signInWithGoogle.bind(null, "/join/CODE").
export const signInWithGoogle = async (returnTo: string) => {
  const callbackURL = isPathOnThisSite(returnTo) ? returnTo : "/";
  const { url } = await auth.api.signInSocial({ body: { provider: "google", callbackURL } });
  // Without an ID token in the request, Better Auth always answers with Google's sign-in URL.
  if (!url) {
    throw new Error("Better Auth returned no Google sign-in URL.");
  }
  redirect(url);
};

export const signOut = async () => {
  await auth.api.signOut({ headers: await headers() });
  redirect("/");
};
