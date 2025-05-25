import * as React from 'react';

import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted', className)}
      {...props}
    />
  );
}

// Predefined skeleton patterns for common use cases
const SkeletonText = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    lines?: number;
    lastLineWidth?: string;
  }
>(({ className, lines = 3, lastLineWidth = '60%', ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props}>
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        className={cn(
          'h-4',
          i === lines - 1 ? `w-[${lastLineWidth}]` : 'w-full'
        )}
      />
    ))}
  </div>
));
SkeletonText.displayName = 'SkeletonText';

const SkeletonCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-3', className)} {...props}>
    <Skeleton className="h-48 w-full rounded-lg" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    rows?: number;
    cols?: number;
  }
>(({ className, rows = 5, cols = 4, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-3', className)} {...props}>
    {/* Header */}
    <div className="flex space-x-4">
      {Array.from({ length: cols }, (_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }, (_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4">
        {Array.from({ length: cols }, (_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
));
SkeletonTable.displayName = 'SkeletonTable';

export { Skeleton, SkeletonText, SkeletonCard, SkeletonTable };