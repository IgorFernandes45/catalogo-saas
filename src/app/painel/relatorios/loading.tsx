export default function RelatoriosLoading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <section className="surface-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="h-3 w-24 rounded-full bg-slate-100" />
            <div className="mt-2 h-8 w-52 rounded-lg bg-slate-100" />
            <div className="mt-3 h-3 w-72 rounded-full bg-slate-100" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-20 rounded-full bg-slate-100" />
            <div className="h-9 w-20 rounded-full bg-slate-100" />
          </div>
        </div>
        <div className="mt-6 h-12 rounded-2xl bg-slate-100" />
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="h-3 w-24 rounded-full bg-slate-100" />
              <div className="mt-3 h-8 w-20 rounded-lg bg-slate-100" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="surface-card p-6">
          <div className="h-3 w-36 rounded-full bg-slate-100" />
          <div className="mt-2 h-7 w-64 rounded-lg bg-slate-100" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded-full bg-slate-100" />
                    <div className="h-3 w-32 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="surface-card p-6">
          <div className="h-3 w-28 rounded-full bg-slate-100" />
          <div className="mt-2 h-7 w-48 rounded-lg bg-slate-100" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-4 w-28 rounded-full bg-slate-100" />
                    <div className="h-3 w-20 rounded-full bg-slate-100" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="h-3 w-36 rounded-full bg-slate-100" />
        <div className="mt-2 h-7 w-72 rounded-lg bg-slate-100" />
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="h-4 w-40 rounded-full bg-slate-100" />
              <div className="mt-1 h-3 w-24 rounded-full bg-slate-100" />
              <div className="mt-3 flex gap-2">
                <div className="h-6 w-16 rounded-full bg-slate-100" />
                <div className="h-6 w-20 rounded-full bg-slate-100" />
                <div className="h-6 w-20 rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="h-3 w-24 rounded-full bg-slate-100" />
        <div className="mt-2 h-7 w-64 rounded-lg bg-slate-100" />
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-4">
              <div className="h-4 w-28 rounded-full bg-slate-100" />
              <div className="mt-1 h-3 w-16 rounded-full bg-slate-100" />
              <div className="mt-3 h-6 w-24 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
