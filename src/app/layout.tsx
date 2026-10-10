import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Predictor",
  description: "Predict the Top 10 of every F1 Session with your League.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer>
          <p>
            Schedule and results from the <a href="https://github.com/jolpica/jolpica-f1">Jolpica F1 API</a>,
            licensed under{" "}
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC BY-NC-SA 4.0</a>.
          </p>
        </footer>
      </body>
    </html>
  );
}
