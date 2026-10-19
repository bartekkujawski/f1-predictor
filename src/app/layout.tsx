import type { Metadata } from "next";
import { Titillium_Web } from "next/font/google";
import { isPlayerAppAdmin } from "../app-admin/signed-in-app-admin";
import { getSignedInPlayer } from "../auth/signed-in-player";
import { BottomNavigation } from "../ui/navigation";
import { AppHeader } from "./app-header";
import { MAIN_SECTIONS } from "./main-sections";
import "./globals.css";

// Titillium Web is not a variable font, so each weight in use is listed.
const titilliumWeb = Titillium_Web({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700"],
  variable: "--font-titillium-web",
});

export const metadata: Metadata = {
  title: "F1 Predictor",
  description: "Predict the Top 10 of every F1 Session with your League.",
};

// The frame of every page. A signed-out visitor gets no navigation: every section needs a Player.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const player = await getSignedInPlayer();
  const isAppAdmin = player ? await isPlayerAppAdmin(player.id) : false;

  return (
    <html lang="en" className={titilliumWeb.variable}>
      {/* On a narrow screen the bottom padding keeps the end of the page clear of the bottom bar. */}
      <body className={player ? "pb-16 md:pb-0" : undefined}>
        {player && <AppHeader player={player} isAppAdmin={isAppAdmin} />}
        <div className="mx-auto max-w-160 px-4 py-6">{children}</div>
        <footer className="mx-auto max-w-160 px-4 pb-6 text-xs text-text-muted">
          <p>
            Schedule and results from the <a href="https://github.com/jolpica/jolpica-f1">Jolpica F1 API</a>,
            licensed under{" "}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>.
          </p>
        </footer>
        {player && <BottomNavigation links={MAIN_SECTIONS} />}
      </body>
    </html>
  );
}
