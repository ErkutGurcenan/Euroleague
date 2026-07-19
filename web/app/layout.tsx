import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import SearchBox from "@/components/SearchBox";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Eurostepper — EuroLeague stats",
    template: "%s · Eurostepper",
  },
  description:
    "EuroLeague standings, results, shot charts, rosters and stats — Eurostepper",
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/standings", label: "Standings" },
  { href: "/games", label: "Games" },
  { href: "/teams", label: "Teams" },
  { href: "/players", label: "Players" },
  { href: "/highs", label: "Highs" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans">
        <header className="border-b border-neutral-800 bg-neutral-900/80 sticky top-0 z-10 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <Logo size={30} />
              Eurostepper
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-300">
              {navLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <SearchBox />
              <span className="text-xs text-neutral-500">2025-26</span>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-600">
          Data: official EuroLeague API · Unofficial fan project
        </footer>
      </body>
    </html>
  );
}
