import { cn } from "@/lib/utils";
import { Skeleton, SkeletonText } from "@/components/ui/skeleton";

interface ContentSkeletonProps {
  type: 'list' | 'grid' | 'stats' | 'form' | 'chart' | 'timeline';
  count?: number;
  className?: string;
}

/**
 * P2: Contextual skeleton loaders for different content types.
 * Uses progressive loading animation with staggered delays.
 */
export function ContentSkeleton({ type, count = 3, className }: ContentSkeletonProps) {
  switch (type) {
    case 'list':
      return (
        <div className={cn("space-y-2", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
            </div>
          ))}
        </div>
      );

    case 'grid':
      return (
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className="rounded-lg border bg-card p-4 space-y-3"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'stats':
      return (
        <div className={cn("grid gap-4 sm:grid-cols-2 lg:grid-cols-4", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className="rounded-lg border bg-card p-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex justify-between items-start mb-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </div>
      );

    case 'form':
      return (
        <div className={cn("space-y-4", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-1.5" style={{ animationDelay: `${i * 100}ms` }}>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>
      );

    case 'chart':
      return (
        <div className={cn("rounded-lg border bg-card p-4", className)}>
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          <div className="h-48 flex items-end gap-2 justify-around px-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="w-8 rounded-t"
                style={{ 
                  height: `${Math.random() * 60 + 40}%`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 px-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-6" />
            ))}
          </div>
        </div>
      );

    case 'timeline':
      return (
        <div className={cn("space-y-4", className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div 
              key={i} 
              className="flex gap-3"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex flex-col items-center">
                <Skeleton className="h-3 w-3 rounded-full" />
                {i < count - 1 && <Skeleton className="w-0.5 flex-1 mt-1" />}
              </div>
              <div className="flex-1 pb-4 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );

    default:
      return <SkeletonText lines={count} className={className} />;
  }
}

/**
 * Inline loading indicator for buttons/actions
 */
export function InlineLoader({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-current animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}
