import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function SignInPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/app");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(32,26,24,0.08)] backdrop-blur md:p-8">
        <div className="mb-6 space-y-2 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--accent)]">
            REVORY
          </p>
          <h1 className="text-3xl font-semibold">Sign in</h1>
        </div>

        <div className="flex justify-center">
          <SignIn />
        </div>
      </section>
    </main>
  );
}
