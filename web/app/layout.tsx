import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Logo from "@/components/Logo";
import MobileNav from "@/components/MobileNav";
import SearchBox from "@/components/SearchBox";
import SeasonSelect from "@/components/SeasonSelect";
import { getSeasons } from "@/lib/api";
import { currentSeason } from "@/lib/season";
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
  { href: "/all-time", label: "All-time" },
  { href: "/notable", label: "Notable" },
  { href: "/honor", label: "Honor" },
  { href: "/compare", label: "Compare" },
];

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [seasonData, selected] = await Promise.all([
    getSeasons().catch(() => null),
    currentSeason(),
  ]);
  const seasons = seasonData?.seasons ?? [];
  const current = selected ?? seasonData?.default ?? "E2025";
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100 font-sans">
        <header className="border-b border-neutral-800 bg-neutral-900/80 sticky top-0 z-10 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
            <Link
              href="/"
              className="flex shrink-0 items-center gap-2 text-lg font-bold tracking-tight"
            >
              <Logo size={30} />
              Eurostepper
            </Link>
            <MobileNav links={navLinks} />
            <nav className="hidden gap-3 text-sm text-neutral-300 lg:flex">
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
              <SeasonSelect seasons={seasons} current={current} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-600">
          Data: official EuroLeague API · Unofficial fan project
        </footer>
      </body>
    </html>
  );
}
