function LoadingBar({
  widthClass,
}: Readonly<{
  widthClass: string;
}>) {
  return (
    <div
      className={`h-3 rounded-full bg-[rgba(255,255,255,0.06)] ${widthClass} animate-pulse`}
    />
  );
}

function LoadingCard() {
  return (
    <div className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
      <LoadingBar widthClass="w-24" />
      <LoadingBar widthClass="mt-4 w-2/3" />
      <LoadingBar widthClass="mt-3 w-full" />
      <LoadingBar widthClass="mt-2 w-5/6" />
    </div>
  );
}

export default function AppLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-4 lg:px-5 lg:py-5">
      <div className="mx-auto grid max-w-[1480px] gap-5 lg:grid-cols-[228px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[rgba(17,16,24,0.82)] p-4 lg:h-[calc(100vh-3rem)]">
          <LoadingBar widthClass="w-28" />
          <LoadingBar widthClass="mt-4 w-full" />
          <LoadingBar widthClass="mt-3 w-4/5" />
          <div className="mt-8 space-y-3">
            <LoadingBar widthClass="w-full" />
            <LoadingBar widthClass="w-full" />
            <LoadingBar widthClass="w-11/12" />
            <LoadingBar widthClass="w-10/12" />
          </div>
        </div>

        <div className="space-y-5">
          <header className="rounded-[22px] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(19,18,25,0.98),rgba(15,14,21,0.97))] px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <LoadingBar widthClass="w-56" />
                <LoadingBar widthClass="mt-3 w-72 max-w-full" />
              </div>
              <div className="flex items-center gap-3">
                <LoadingBar widthClass="w-44" />
                <LoadingBar widthClass="w-20" />
                <LoadingBar widthClass="w-16" />
              </div>
            </div>
          </header>

          <section className="rounded-[28px] border border-[rgba(255,255,255,0.06)] bg-[rgba(17,16,24,0.82)] p-5 md:p-7">
            <div className="grid gap-4 xl:grid-cols-2">
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
              <LoadingCard />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
