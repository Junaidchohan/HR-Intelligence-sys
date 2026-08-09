import React from "react";

export type SkeletonType = "grid" | "list" | "details" | "default";

interface PageSkeletonProps {
  type?: SkeletonType;
  className?: string;
}

export function ShimmerBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-[length:200%_100%] animate-shimmer rounded-xl ${className}`}
    />
  );
}

export function PageSkeleton({ type = "grid", className = "" }: PageSkeletonProps) {
  return (
    <div className={`w-full space-y-8 animate-pulse ${className}`}>
      {/* Header Skeleton Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="space-y-2">
          <ShimmerBlock className="h-8 w-64 md:w-80" />
          <ShimmerBlock className="h-4 w-48 md:w-96" />
        </div>
        <div className="flex items-center gap-3">
          <ShimmerBlock className="h-10 w-28 md:w-36 rounded-xl" />
        </div>
      </div>

      {/* Body Skeleton per type */}
      {type === "grid" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between h-56 space-y-4 shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <ShimmerBlock className="h-5 w-28" />
                  <ShimmerBlock className="h-4 w-16 rounded-full" />
                </div>
                <ShimmerBlock className="h-4 w-3/4" />
                <ShimmerBlock className="h-3 w-1/2" />
              </div>
              <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <ShimmerBlock className="h-6 w-20 rounded-lg" />
                <ShimmerBlock className="h-8 w-24 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {type === "list" && (
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-2xl">
          {/* Table Header Bar Skeleton */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <ShimmerBlock className="h-4 w-32" />
            <ShimmerBlock className="h-8 w-48 rounded-xl" />
          </div>

          {/* 4 Horizontal Bar / Row Skeletons */}
          <div className="space-y-3 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-800/50 rounded-xl gap-4"
              >
                <div className="flex items-center gap-4 flex-1">
                  <ShimmerBlock className="w-12 h-12 rounded-full flex-shrink-0" />
                  <div className="space-y-2 flex-1 max-w-md">
                    <ShimmerBlock className="h-4 w-2/3" />
                    <ShimmerBlock className="h-3 w-1/3" />
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-3">
                  <ShimmerBlock className="h-6 w-20 rounded-full" />
                  <ShimmerBlock className="h-6 w-16 rounded-full" />
                </div>
                <ShimmerBlock className="h-8 w-24 rounded-xl flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

      {(type === "details" || type === "default") && (
        <div className="space-y-6">
          {/* Detailed top section */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
            <ShimmerBlock className="h-6 w-48" />
            <ShimmerBlock className="h-4 w-3/4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <ShimmerBlock className="h-10 w-full rounded-xl" />
              <ShimmerBlock className="h-10 w-full rounded-xl" />
              <ShimmerBlock className="h-10 w-full rounded-xl" />
            </div>
          </div>

          {/* Cards section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <ShimmerBlock className="h-5 w-32" />
                  <ShimmerBlock className="h-4 w-20 rounded-full" />
                </div>
                <ShimmerBlock className="h-4 w-full" />
                <ShimmerBlock className="h-4 w-5/6" />
                <ShimmerBlock className="h-10 w-full rounded-xl mt-4" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PageSkeleton;
