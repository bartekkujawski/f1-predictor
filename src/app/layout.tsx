import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Predictor",
  description: "Predict the Top 10 of every F1 Session with your League.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
