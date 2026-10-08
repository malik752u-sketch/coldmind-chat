import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ColdMind | Clear thinking starts here",
  description: "A calm space to ask, explore, and think with ColdMind.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
