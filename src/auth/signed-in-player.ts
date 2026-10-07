import { headers } from "next/headers";
import { auth } from "./auth";

export type SignedInPlayer = { id: string; nickname: string };

// The Player whose session cookie came with the current request, or null when signed out.
export const getSignedInPlayer = async (): Promise<SignedInPlayer | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return null;
  }
  // The nickname column is NOT NULL, but Better Auth types it as optional (see create-auth.ts).
  return { id: session.user.id, nickname: session.user.nickname ?? session.user.name };
};
