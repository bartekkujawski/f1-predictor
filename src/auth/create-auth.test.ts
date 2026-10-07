import type { GoogleOptions } from "better-auth/social-providers";
import { convertSetCookieToCookie } from "better-auth/test";
import { describe, expect, it } from "vitest";
import type { Database } from "../db/database";
import { player } from "../db/schema";
import { createTestDatabase } from "../db/test-database";
import { type Auth, createAuth } from "./create-auth";

type GoogleAccount = { id: string; name: string; email: string };

const ania: GoogleAccount = { id: "google-ania", name: "Anna Nowak", email: "ania@example.com" };

// Google that trusts any ID token and always answers with the given account. No network.
const fakeGoogle = (account: GoogleAccount): GoogleOptions => ({
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  verifyIdToken: async () => true,
  getUserInfo: async () => ({
    user: { name: account.name, email: account.email, emailVerified: true },
    data: {
      sub: account.id,
      name: account.name,
      email: account.email,
      email_verified: true,
      given_name: account.name,
      family_name: "",
      picture: "",
      aud: "test-client-id",
      azp: "test-client-id",
      iss: "https://accounts.google.com",
      iat: 0,
      exp: 0,
    },
  }),
});

const authFor = (db: Database, account: GoogleAccount): Auth => createAuth(db, fakeGoogle(account));

// Signs in like the app does after Google, and returns the session cookie as request headers.
const signIn = async (auth: Auth): Promise<Headers> => {
  const { headers } = await auth.api.signInSocial({
    body: { provider: "google", idToken: { token: "google-id-token" } },
    returnHeaders: true,
  });
  return convertSetCookieToCookie(headers);
};

describe("sign-in with Google", () => {
  it("creates a Player on first sign-in, with the Google name as nickname", async () => {
    const db = await createTestDatabase();

    await signIn(authFor(db, ania));

    const players = await db.select({ email: player.email, nickname: player.nickname }).from(player);
    expect(players).toEqual([{ email: "ania@example.com", nickname: "Anna Nowak" }]);
  });

  it("signs the same Player in later, keeping the nickname from the first sign-in", async () => {
    const db = await createTestDatabase();

    await signIn(authFor(db, ania));
    await signIn(authFor(db, { ...ania, name: "Anna Kowalska" }));

    const players = await db.select({ nickname: player.nickname }).from(player);
    expect(players).toEqual([{ nickname: "Anna Nowak" }]);
  });

  it("recognises the signed-in Player by the session cookie", async () => {
    const auth = authFor(await createTestDatabase(), ania);
    const cookies = await signIn(auth);

    const session = await auth.api.getSession({ headers: cookies });

    expect(session?.user.nickname).toBe("Anna Nowak");
  });

  it("ends the session on sign-out", async () => {
    const auth = authFor(await createTestDatabase(), ania);
    const cookies = await signIn(auth);

    await auth.api.signOut({ headers: cookies });

    expect(await auth.api.getSession({ headers: cookies })).toBeNull();
  });
});
