export default function MembersLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          <div className="h-6 w-36 rounded-lg bg-[#e0e0e0]" />
          <div className="mt-1.5 h-3 w-56 rounded bg-[#e0e0e0]" />
        </div>
        <div className="h-8 w-32 rounded-full bg-[#e0e0e0]" />
      </div>

      <div className="rounded-xl border border-[#e0e0e0] bg-white">
        <div className="border-b border-[#e0e0e0] px-5 py-3">
          <div className="h-4 w-32 rounded bg-[#e8e8ed]" />
        </div>
        <div className="divide-y divide-[#f0f0f0]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3">
              <div className="h-3 w-16 rounded bg-[#e8e8ed]" />
              <div className="h-3 w-32 rounded bg-[#e8e8ed]" />
              <div className="h-3 w-24 rounded bg-[#e8e8ed]" />
              <div className="h-3 w-20 rounded bg-[#e8e8ed]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
