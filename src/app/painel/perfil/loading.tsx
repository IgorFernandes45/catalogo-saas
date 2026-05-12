export default function PerfilLoading() {
  return (
    <div className="surface-card p-6 animate-pulse">
      <div className="h-3 w-16 rounded-full bg-slate-100" />
      <div className="mt-2 h-8 w-80 rounded-lg bg-slate-100" />
      <div className="mt-8 grid gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-10 rounded-2xl bg-slate-100" />
        <div className="h-24 rounded-2xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 rounded-2xl bg-slate-100" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-10 rounded-2xl bg-slate-100" />
          <div className="h-10 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-10 rounded-2xl bg-slate-100" />
        <div className="h-10 w-36 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}
