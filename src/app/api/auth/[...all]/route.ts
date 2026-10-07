import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "../../../../auth/auth";

// Better Auth's endpoints, e.g. the callback Google redirects to after sign-in.
export const { GET, POST } = toNextJsHandler(auth);
