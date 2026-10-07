import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getSignedInPlayer } from "../auth/signed-in-player";
import HomePage from "./page";

// The page reads the session and signs in and out through these modules, which need a real
// request and database. Here the test decides who is signed in.
vi.mock("../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../auth/actions", () => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }));

const renderHomePage = async (): Promise<string> => renderToStaticMarkup(await HomePage());

describe("HomePage", () => {
  it("renders the app name as the main heading", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    expect(await renderHomePage()).toContain("<h1>F1 Predictor</h1>");
  });

  it("offers sign-in with Google when nobody is signed in", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    const html = await renderHomePage();

    expect(html).toContain("Sign in with Google");
    expect(html).not.toContain("Sign out");
  });

  it("shows the signed-in Player's nickname and a sign-out button", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue({ nickname: "Anna Nowak" });

    const html = await renderHomePage();

    expect(html).toContain("Anna Nowak");
    expect(html).toContain("Sign out");
    expect(html).not.toContain("Sign in with Google");
  });
});
