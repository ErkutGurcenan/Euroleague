export const metadata = {
  title: "Guide",
  description:
    "What the numbers on Eurostepper mean, in plain words: PIR, true shooting, power ratings, on/off swing, win chances, Polymarket prices and more.",
};

import Link from "@/components/Link";
import { GLOSSARY } from "@/lib/glossary";

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-3 text-2xl font-bold">Guide</h1>
      <p className="mb-5 text-neutral-300">
        What the numbers and labels on Eurostepper mean, in plain words.
      </p>

      <nav aria-label="Topics" className="mb-8 flex flex-wrap gap-2">
        {GLOSSARY.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-sm text-neutral-300 transition-colors hover:border-orange-600/50 hover:text-white"
          >
            {s.title}
          </a>
        ))}
      </nav>

      {GLOSSARY.map((s) => (
        <section key={s.id} id={s.id} className="mb-10 scroll-mt-20">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <span className="text-sm text-neutral-500">
              {"See it on "}
              {s.links.map((l, i) => (
                <span key={l.href}>
                  {i > 0 && " · "}
                  <Link href={l.href} className="text-orange-400 hover:underline">
                    {l.label}
                  </Link>
                </span>
              ))}
            </span>
          </div>
          <dl className="divide-y divide-neutral-800/60 rounded-lg border border-neutral-800">
            {s.terms.map((t) => (
              <div
                key={t.id}
                id={t.id}
                className="grid scroll-mt-20 gap-1 px-4 py-3 target:bg-orange-500/10 sm:grid-cols-[11rem_1fr] sm:gap-4"
              >
                <dt>
                  <div className="font-semibold">{t.label}</div>
                  {t.name && <div className="text-xs text-neutral-500">{t.name}</div>}
                </dt>
                <dd className="text-sm text-neutral-300">
                  {t.short}
                  {t.more && <span className="mt-1 block text-neutral-400">{t.more}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      <p className="border-t border-neutral-800 pt-4 text-xs text-neutral-500">
        Where the data comes from and how the site is built:{" "}
        <Link href="/about" className="text-neutral-400 hover:text-orange-400">About</Link>.
      </p>
    </div>
  );
}
