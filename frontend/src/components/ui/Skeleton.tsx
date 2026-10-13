import React from 'react';
import { cn } from '../../lib/utils';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-slate-200/70 dark:bg-slate-800/60',
        className,
      )}
    />
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 7 }) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 dark:border-slate-800/40 bg-white/50 dark:bg-[#0c101c]/50"
        >
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <Skeleton className="w-16 h-4 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="w-3/4 h-3.5" />
            <Skeleton className="w-1/3 h-2.5" />
          </div>
          <Skeleton className="w-16 h-5 rounded-full shrink-0" />
          <Skeleton className="w-16 h-5 rounded-full shrink-0" />
          <Skeleton className="w-16 h-4 shrink-0" />
          <Skeleton className="w-12 h-4 shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const TreeSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 p-1.5">
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <Skeleton className={`h-3.5 rounded ${i % 2 === 0 ? 'w-28' : 'w-36'}`} />
          <Skeleton className="w-5 h-3.5 ml-auto rounded shrink-0" />
        </div>
      ))}
    </div>
  );
};

export const CardsSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-4 rounded-xl border border-slate-200/90 dark:border-slate-800/80 bg-white dark:bg-[#0c101c] space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="w-16 h-4 rounded-full" />
            <Skeleton className="w-12 h-3" />
          </div>
          <Skeleton className="w-3/4 h-4" />
          <Skeleton className="w-full h-8" />
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <Skeleton className="w-20 h-3" />
            <Skeleton className="w-16 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
};
