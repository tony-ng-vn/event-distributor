/**
 * Placeholder cards while /api/events is loading — matches social card layout.
 */
export function FeedSkeleton() {
  return (
    <div
      className="grid auto-rows-min gap-3 lg:grid-cols-2"
      aria-busy="true"
      data-testid="feed-skeleton"
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="glass-card row-span-4 grid grid-rows-subgrid gap-3 overflow-hidden rounded-2xl"
        >
          <div className="flex gap-3.5 px-4 pt-4">
            <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-xl bg-surface-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
          <div className="going-strip mx-4 mb-0">
            <div className="mb-2 h-3 w-20 animate-pulse rounded bg-surface-muted" />
            <div className="h-8 w-40 animate-pulse rounded-full bg-surface-muted" />
          </div>
          <div className="grid grid-cols-2 gap-2 px-4">
            <div className="h-11 animate-pulse rounded-full bg-surface-muted" />
            <div className="h-11 animate-pulse rounded-full bg-surface-muted" />
          </div>
          <div className="px-4 pb-4">
            <div className="h-11 animate-pulse rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
