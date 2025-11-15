'use client';

import { Agent } from '@/lib/types';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type TimeRange = '1D' | '7D' | '30D' | 'ALL';

type EquityDataPoint = {
  timestamp: string;
  [key: string]: number | string; // Agent IDs as keys with balance values
};

const AGENT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function EquityCurve({ agents }: { agents: Agent[] }) {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');
  const [equityData, setEquityData] = useState<EquityDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchEquityData();
  }, [timeRange]);

  async function fetchEquityData() {
    setLoading(true);
    try {
      const response = await fetch(`/api/equity-snapshots?range=${timeRange}`);
      const data = await response.json();
      setEquityData(data);
    } catch (error) {
      console.error('Error fetching equity data:', error);
      // Generate initial data points if no snapshots exist
      generateInitialData();
    } finally {
      setLoading(false);
    }
  }

  function generateInitialData() {
    // Create initial data point showing all agents starting at $1000
    const now = new Date();
    const initialPoint: EquityDataPoint = {
      timestamp: now.toISOString(),
    };

    agents.forEach(agent => {
      initialPoint[agent.id] = agent.balance;
    });

    setEquityData([initialPoint]);
  }

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
          <button
            onClick={() => setTimeRange('1D')}
            className={`px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 ${
              timeRange === '1D' ? 'bg-gray-900 text-white' : ''
            }`}
          >
            1D
          </button>
          <button
            onClick={() => setTimeRange('7D')}
            className={`px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 ${
              timeRange === '7D' ? 'bg-gray-900 text-white' : ''
            }`}
          >
            7D
          </button>
          <button
            onClick={() => setTimeRange('30D')}
            className={`px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 ${
              timeRange === '30D' ? 'bg-gray-900 text-white' : ''
            }`}
          >
            30D
          </button>
          <button
            onClick={() => setTimeRange('ALL')}
            className={`px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 ${
              timeRange === 'ALL' ? 'bg-gray-900 text-white' : ''
            }`}
          >
            ALL
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center text-gray-400">Loading equity data...</div>
        </div>
      ) : equityData.length === 0 ? (
        <div className="h-64 bg-gray-50 rounded flex items-center justify-center">
          <div className="text-center text-gray-400">
            <p className="mb-2">No equity data yet</p>
            <p className="text-xs">Data will appear as agents place bets</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={256}>
          <LineChart data={equityData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                fontSize: '12px'
              }}
              labelFormatter={(value) => {
                const date = new Date(value as string);
                return date.toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
            />
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="line"
            />
            {agents.slice(0, 6).map((agent, i) => (
              <Line
                key={agent.id}
                type="monotone"
                dataKey={agent.id}
                name={agent.display_name}
                stroke={AGENT_COLORS[i]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        {agents.slice(0, 6).map((agent, i) => {
          const plSign = agent.total_pl >= 0 ? '+' : '';
          const plColor = agent.total_pl >= 0 ? 'text-green-600' : 'text-red-600';
          return (
            <div key={agent.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: AGENT_COLORS[i] }}
              />
              <span>{agent.display_name}</span>
              <span className={plColor}>
                ({plSign}${agent.total_pl.toFixed(2)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
