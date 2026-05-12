export default function PedidosLoading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="surface-card p-6">
        <div className="h-3 w-28 rounded-full bg-slate-100" />
        <div className="mt-2 h-8 w-64 rounded-lg bg-slate-100" />
        <div className="mt-3 h-4 w-96 rounded-full bg-slate-100" />
        <div className="mt-6 h-10 w-full rounded-2xl bg-slate-100" />
        <div className="mt-4 grid gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded-full bg-slate-100" />
                  <div className="h-3 w-32 rounded-full bg-slate-100" />
                  <div className="h-3 w-56 rounded-full bg-slate-100" />
                </div>
                <div className="h-6 w-20 rounded-full bg-slate-100" />
              </div>
              <div className="mt-4 flex gap-2">
                <div className="h-9 w-36 rounded-full bg-slate-100" />
                <div className="h-9 w-24 rounded-full bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
