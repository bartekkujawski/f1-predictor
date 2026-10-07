"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

// Server actions behind the sign-in and sign-out buttons. The nextCookies plugin
// sets and clears the cookies Better Auth returns.

export const signInWithGoogle = async () => {
  const { url } = await auth.api.signInSocial({ body: { provider: "google", callbackURL: "/" } });
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
