import React from 'react';

export function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-2xl border border-neutral-800/80 bg-neutral-900/30 p-5 backdrop-blur-md animate-pulse">
      {/* Top Bar Skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-neutral-800" />
          <div className="h-5 w-20 rounded-full bg-neutral-800" />
        </div>
        <div className="h-6 w-16 rounded-xl bg-neutral-800" />
      </div>

      {/* Video Placeholder Skeleton */}
      <div className="mb-4 aspect-video w-full rounded-xl bg-neutral-800/70" />

      {/* Timestamp & Title Skeleton */}
      <div className="mb-3 space-y-2">
        <div className="h-3.5 w-32 rounded bg-neutral-800" />
        <div className="h-5 w-3/4 rounded bg-neutral-800" />
      </div>

      {/* Reason Skeleton */}
      <div className="mb-4 space-y-1.5">
        <div className="h-3 w-full rounded bg-neutral-800/60" />
        <div className="h-3 w-5/6 rounded bg-neutral-800/60" />
      </div>

      {/* Quote Box Skeleton */}
      <div className="mb-5 rounded-xl border border-neutral-800/50 bg-neutral-950/40 p-3.5 space-y-2">
        <div className="h-2.5 w-20 rounded bg-neutral-800/50" />
        <div className="h-3 w-full rounded bg-neutral-800/80" />
      </div>

      {/* Score Bars Skeleton */}
      <div className="mt-auto space-y-3 pt-3 border-t border-neutral-800/40">
        <div className="space-y-1">
          <div className="h-2.5 w-24 rounded bg-neutral-800" />
          <div className="h-1.5 w-full rounded bg-neutral-800" />
        </div>
        <div className="space-y-1">
          <div className="h-2.5 w-28 rounded bg-neutral-800" />
          <div className="h-1.5 w-full rounded bg-neutral-800" />
        </div>
        <div className="space-y-1">
          <div className="h-2.5 w-24 rounded bg-neutral-800" />
          <div className="h-1.5 w-full rounded bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
