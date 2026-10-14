export default function LawyerCardSkeleton() {
  return (
    <div className="flex flex-col border border-color-border-light bg-color-background">
      {/* Photo Placeholder Skeleton */}
      <div className="aspect-[4/3] w-full bg-gray-200 animate-pulse border-b border-color-border-light"></div>

      {/* Content Skeleton */}
      <div className="flex flex-1 flex-col p-6 space-y-4">
        
        {/* Title & Subtitle */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 animate-pulse rounded w-3/4"></div>
          <div className="h-4 bg-gray-100 animate-pulse rounded w-1/2"></div>
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-4 w-4 bg-gray-200 animate-pulse rounded-full"></div>
          <div className="h-4 bg-gray-100 animate-pulse rounded w-1/4"></div>
        </div>

        {/* Specialty & Location */}
        <div className="space-y-2 pt-2">
          <div className="h-4 bg-gray-100 animate-pulse rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 animate-pulse rounded w-1/2"></div>
        </div>

        {/* Description Lines */}
        <div className="space-y-2 pt-2 mb-6">
          <div className="h-3 bg-gray-100 animate-pulse rounded w-full"></div>
          <div className="h-3 bg-gray-100 animate-pulse rounded w-5/6"></div>
          <div className="h-3 bg-gray-100 animate-pulse rounded w-4/6"></div>
        </div>

        {/* Action Buttons Skeleton */}
        <div className="mt-auto pt-4 border-t border-color-border-light flex flex-col gap-2 xl:flex-row">
          <div className="flex-1 h-10 bg-gray-200 animate-pulse"></div>
          <div className="flex-1 h-10 bg-gray-100 animate-pulse border border-color-border-light"></div>
        </div>
        
      </div>
    </div>
  );
}
