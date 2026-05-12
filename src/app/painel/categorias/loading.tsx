export default function CategoriasLoading() {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] animate-pulse">
      <section className="surface-card p-6">
        <div className="h-3 w-24 rounded-full bg-slate-100" />
        <div className="mt-2 h-8 w-56 rounded-lg bg-slate-100" />
        <div className="mt-8 grid gap-4">
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="grid grid-cols-3 gap-3">
            <div className="h-9 rounded-2xl bg-slate-100" />
            <div className="h-9 rounded-2xl bg-slate-100" />
            <div className="h-9 rounded-2xl bg-slate-100" />
          </div>
          <div className="h-10 w-36 rounded-full bg-slate-100" />
        </div>
      </section>

      <section className="surface-card p-6">
        <div className="h-3 w-32 rounded-full bg-slate-100" />
        <div className="mt-2 h-8 w-64 rounded-lg bg-slate-100" />
        <div className="mt-6 grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-36 rounded-full bg-slate-100" />
                  <div className="h-3 w-24 rounded-full bg-slate-100" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-16 rounded-full bg-slate-100" />
                  <div className="h-8 w-16 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
