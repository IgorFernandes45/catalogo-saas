export default function ProdutosLoading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1">
            <div className="h-3 w-40 rounded-full bg-slate-100" />
            <div className="mt-2 h-9 w-full max-w-xl rounded-lg bg-slate-100" />
            <div className="mt-3 h-3 w-full max-w-lg rounded-full bg-slate-100" />
            <div className="mt-1 h-3 w-96 rounded-full bg-slate-100" />
          </div>
          <div className="h-11 w-48 rounded-full bg-slate-100" />
        </div>
        <div className="mt-8 grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-2xl bg-slate-100" />
            <div className="h-10 rounded-2xl bg-slate-100" />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="h-10 rounded-2xl bg-slate-100" />
            <div className="h-10 rounded-2xl bg-slate-100" />
            <div className="h-10 rounded-2xl bg-slate-100" />
          </div>
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 w-40 rounded-full bg-slate-100" />
        </div>
      </section>
    </div>
  );
}
