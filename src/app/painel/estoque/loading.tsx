export default function EstoqueLoading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="surface-card p-6">
        <div className="h-3 w-20 rounded-full bg-slate-100" />
        <div className="mt-2 h-8 w-56 rounded-lg bg-slate-100" />
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="h-10 w-40 rounded-full bg-slate-100" />
          <div className="h-10 w-32 rounded-full bg-slate-100" />
          <div className="h-10 w-36 rounded-full bg-slate-100" />
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="size-14 shrink-0 rounded-2xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded-full bg-slate-100" />
                  <div className="h-3 w-20 rounded-full bg-slate-100" />
                  <div className="h-3 w-24 rounded-full bg-slate-100" />
                </div>
              </div>
              <div className="mt-4 h-9 w-full rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
