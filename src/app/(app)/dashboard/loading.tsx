export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Header skeleton */}
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          <div className="h-6 w-48 rounded-lg bg-[#e0e0e0]" />
          <div className="mt-1.5 h-3 w-72 rounded bg-[#e0e0e0]" />
        </div>
        <div className="h-8 w-32 rounded-full bg-[#e0e0e0]" />
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[14px] border border-[#e0e0e0] bg-white px-3.5 py-2.5"
          >
            <div className="h-3 w-20 rounded bg-[#e8e8ed]" />
            <div className="mt-2 h-6 w-14 rounded bg-[#e8e8ed]" />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="mt-5 grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border border-[#e0e0e0] bg-white p-5">
          <div className="h-4 w-40 rounded bg-[#e8e8ed]" />
          <div className="mt-2 h-3 w-64 rounded bg-[#e8e8ed]" />
          <div className="mt-6 h-40 rounded-lg bg-[#f5f5f7]" />
        </div>
        <div className="lg:col-span-2 rounded-xl border border-[#e0e0e0] bg-white p-5">
          <div className="h-4 w-44 rounded bg-[#e8e8ed]" />
          <div className="mt-2 h-3 w-52 rounded bg-[#e8e8ed]" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-5 rounded bg-[#f5f5f7]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
