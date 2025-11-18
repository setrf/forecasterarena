import { SkeletonStat, SkeletonCard } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="h-4 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>

          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="h-10 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>
            <div className="text-right">
              <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4">
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
            <SkeletonStat />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Current Positions */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">💼 CURRENT POSITIONS</h2>
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>

        {/* Decision Patterns */}
        <section>
          <h2 className="text-2xl font-bold mb-4">🧠 DECISION PATTERNS</h2>
          <div className="grid grid-cols-2 gap-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </section>
      </div>
    </div>
  );
}
