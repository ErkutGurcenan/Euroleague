export default function Loading() {
  return (
    <div className="animate-pulse" aria-label="Loading" role="status">
      <div className="mb-6 h-7 w-44 rounded bg-neutral-800/70" />
      <div className="mb-4 h-4 w-72 max-w-full rounded bg-neutral-800/50" />
      <div className="overflow-hidden rounded-lg border border-neutral-800">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${
              i > 0 ? "border-t border-neutral-800/60" : "bg-neutral-900"
            }`}
          >
            <div className="h-4 w-4 rounded-full bg-neutral-800/70" />
            <div
              className="h-4 rounded bg-neutral-800/60"
              style={{ width: `${55 - (i % 4) * 9}%` }}
            />
            <div className="ml-auto h-4 w-10 rounded bg-neutral-800/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
