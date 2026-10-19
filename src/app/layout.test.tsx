import { usePathname } from "next/navigation";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isPlayerAppAdmin } from "../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../auth/signed-in-player";
import RootLayout from "./layout";

// next/font only works inside a Next.js build, and the navigation needs the router's current path.
vi.mock("next/font/google", () => ({ Titillium_Web: () => ({ variable: "font-titillium-web" }) }));
vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));
vi.mock("../auth/signed-in-player", () => ({ getSignedInPlayer: vi.fn() }));
vi.mock("../auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("../app-admin/signed-in-app-admin", () => ({ isPlayerAppAdmin: vi.fn() }));

const ania = { id: "player-ania", nickname: "Anna Nowak" };

const renderLayout = async (): Promise<string> =>
  renderToStaticMarkup(await RootLayout({ children: <main>Page content</main>, params: Promise.resolve({}) }));

// Both the bottom bar and the header carry the same links, each marking the current section.
const currentLinks = (html: string): string[] =>
  [...html.matchAll(/<a[^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map(([, label]) => label);

describe("RootLayout", () => {
  beforeEach(() => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(ania);
    vi.mocked(isPlayerAppAdmin).mockResolvedValue(false);
    vi.mocked(usePathname).mockReturnValue("/");
  });

  it("renders the page inside the layout", async () => {
    expect(await renderLayout()).toContain("<main>Page content</main>");
  });

  it("links a signed-in Player to Home, the Calendar and the Season Table", async () => {
    const html = await renderLayout();

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/rounds"');
    expect(html).toContain('href="/season-table"');
  });

  it("marks the current section, including the pages below it", async () => {
    expect(currentLinks(await renderLayout())).toEqual(["Home", "Home"]);

    vi.mocked(usePathname).mockReturnValue("/rounds/2/Race");
    expect(currentLinks(await renderLayout())).toEqual(["Calendar", "Calendar"]);

    vi.mocked(usePathname).mockReturnValue("/season-table");
    expect(currentLinks(await renderLayout())).toEqual(["Season Table", "Season Table"]);
  });

  it("shows the signed-in Player's nickname and a sign-out button in the header menu", async () => {
    const html = await renderLayout();

    expect(html).toContain("Anna Nowak");
    expect(html).toContain("Sign out");
  });

  it("links to the admin panel only for the App Admin", async () => {
    expect(await renderLayout()).not.toContain('href="/admin"');

    vi.mocked(isPlayerAppAdmin).mockResolvedValue(true);
    expect(await renderLayout()).toContain('href="/admin"');
  });

  it("shows no navigation and no menu when nobody is signed in", async () => {
    vi.mocked(getSignedInPlayer).mockResolvedValue(null);

    const html = await renderLayout();

    expect(html).toContain("<main>Page content</main>");
    expect(html).not.toContain('href="/rounds"');
    expect(html).not.toContain("Sign out");
  });
});
