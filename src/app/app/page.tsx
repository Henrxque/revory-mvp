import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function AuthenticatedAppPage() {
  const { userId } = await auth();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-16">
      <section className="w-full rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-[0_24px_80px_rgba(32,26,24,0.08)] backdrop-blur md:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
              Authenticated app
            </p>
            <h1 className="mt-3 text-3xl font-semibold md:text-5xl">
              Clerk is connected, protected routes are working, and the local
              user sync is active.
            </h1>
          </div>

          <UserButton />
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-black/45">Status</p>
            <p className="mt-3 text-xl font-semibold">Signed in</p>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-black/45">User ID</p>
            <p className="mt-3 break-all text-sm font-medium text-black/70">{userId}</p>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-white/80 p-5">
            <p className="text-sm uppercase tracking-[0.24em] text-black/45">Next step</p>
            <p className="mt-3 text-sm leading-6 text-black/70">
              Workspace creation and onboarding wizard connect here next.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
