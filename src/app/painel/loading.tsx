export default function DashboardLoading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="h-3 w-20 rounded-full bg-slate-100" />
            <div className="mt-3 h-8 w-16 rounded-lg bg-slate-100" />
          </div>
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-card p-6">
          <div className="h-3 w-16 rounded-full bg-slate-100" />
          <div className="mt-2 h-7 w-48 rounded-lg bg-slate-100" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded-2xl bg-slate-100" />
            ))}
          </div>
        </div>
        <div className="surface-card p-6">
          <div className="h-3 w-24 rounded-full bg-slate-100" />
          <div className="mt-2 h-7 w-56 rounded-lg bg-slate-100" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-3xl bg-slate-100" />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
