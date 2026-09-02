import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Setai Art — Persian Art for Scandinavian Collectors",
  description: "Discover and acquire curated paintings and sculpture by selected Persian artists. Insured delivery across Scandinavia.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
