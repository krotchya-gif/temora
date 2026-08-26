// Skeleton loading untuk seluruh area /admin (task 019).
export default function AdminLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat">
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-bg-warm" />
        <div className="h-4 w-64 animate-pulse rounded-lg bg-bg-warm" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-bg-warm" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-bg-warm" />
    </div>
  );
}
