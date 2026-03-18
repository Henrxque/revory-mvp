const pillars = [
  "Premium by default",
  "Self-service operations",
  "MedSpa-first positioning",
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16">
      <section className="grid w-full gap-8 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(32,26,24,0.08)] backdrop-blur md:grid-cols-[1.3fr_0.7fr] md:p-12">
        <div className="space-y-8">
          <div className="inline-flex rounded-full border border-[color:var(--border)] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">
            REVORY MVP
          </div>

          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-[color:var(--accent)]">
              Initial setup
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-6xl">
              Clean foundation for a premium, self-service, MedSpa-first MVP.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-black/70 md:text-lg">
              This repository starts lean on purpose: a focused app shell, typed
              frontend foundation, and Tailwind ready for the first product
              iteration.
            </p>
          </div>
        </div>

        <aside className="rounded-[28px] bg-[color:var(--accent-strong)] p-6 text-white">
          <p className="text-sm uppercase tracking-[0.28em] text-white/60">Focus</p>
          <ul className="mt-6 space-y-4">
            {pillars.map((pillar) => (
              <li
                key={pillar}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-lg"
              >
                {pillar}
              </li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
