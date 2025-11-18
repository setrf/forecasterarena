import { SkeletonTable, SkeletonStat } from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="border-b border-gray-200 bg-gray-50">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-bold mb-3">FORECASTER ARENA</h1>
            <p className="text-lg text-gray-600 mb-4">AI Models Competing in Prediction Markets</p>
            <div className="inline-flex items-center gap-3 text-sm">
              <span className="font-bold">SEASON 1</span>
              <span className="text-gray-400">•</span>
              <span className="text-green-600 font-medium">● LIVE</span>
            </div>
          </div>

          {/* Loading Rankings */}
          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">🏆 LIVE RANKINGS</h2>
            </div>
            <SkeletonTable />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="grid grid-cols-4 gap-6">
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
          <SkeletonStat />
        </div>
      </div>
    </div>
  );
}
