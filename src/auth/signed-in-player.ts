import { headers } from "next/headers";
import { auth } from "./auth";

export type SignedInPlayer = { nickname: string };

// The Player whose session cookie came with the current request, or null when signed out.
export const getSignedInPlayer = async (): Promise<SignedInPlayer | null> => {
  const authSession = await auth.api.getSession({ headers: await headers() });
  if (!authSession) {
    return null;
  }
  // The nickname column is NOT NULL, but Better Auth types it as optional (see create-auth.ts).
  return { nickname: authSession.user.nickname ?? authSession.user.name };
};
