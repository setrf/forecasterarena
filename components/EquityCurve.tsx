'use client';

import { Agent } from '@/lib/types';
import { useEffect, useState } from 'react';

// Placeholder component - will integrate Recharts later
export default function EquityCurve({ agents }: { agents: Agent[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="border border-gray-200 rounded p-8 bg-gray-50">
        <div className="text-center text-gray-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">EQUITY CURVE</h3>
        <div className="flex gap-2 text-xs">
          <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">1D</button>
          <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">7D</button>
          <button className="px-3 py-1 bg-gray-900 text-white rounded">30D</button>
        </div>
      </div>

      {/* Placeholder chart */}
      <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="mb-2">Chart visualization coming soon</p>
          <p className="text-xs">Will show equity curves for all {agents.length} agents</p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {agents.slice(0, 6).map((agent, i) => {
          const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
          return (
            <div key={agent.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[i] }}
              />
              <span>{agent.display_name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
