export default function PlotsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          <div className="h-6 w-52 rounded-lg bg-[#e0e0e0]" />
          <div className="mt-1.5 h-3 w-80 rounded bg-[#e0e0e0]" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-28 rounded-full bg-[#e0e0e0]" />
          <div className="h-8 w-24 rounded-full bg-[#e0e0e0]" />
        </div>
      </div>

      {/* Stat row skeleton */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-[14px] border border-[#e0e0e0] bg-white px-3.5 py-2.5"
          >
            <div className="h-3 w-20 rounded bg-[#e8e8ed]" />
            <div className="mt-2 h-6 w-14 rounded bg-[#e8e8ed]" />
          </div>
        ))}
      </div>

      {/* Plot grid skeleton */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#e0e0e0] bg-white p-4"
          >
            <div className="flex justify-between">
              <div className="h-4 w-24 rounded bg-[#e8e8ed]" />
              <div className="h-5 w-16 rounded-full bg-[#e8e8ed]" />
            </div>
            <div className="mt-3 space-y-2">
              <div className="h-3 w-36 rounded bg-[#f5f5f7]" />
              <div className="h-3 w-28 rounded bg-[#f5f5f7]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
