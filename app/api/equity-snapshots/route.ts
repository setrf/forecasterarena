import { NextRequest, NextResponse } from 'next/server';
import db, { queries } from '@/lib/database';
import { Agent } from '@/lib/types';

export const dynamic = 'force-dynamic';

type TimeRange = '1D' | '7D' | '30D' | 'ALL';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get('range') || '30D') as TimeRange;

    // Calculate cutoff date based on time range
    const now = new Date();
    let cutoffDate: Date;

    switch (range) {
      case '1D':
        cutoffDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7D':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30D':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'ALL':
      default:
        cutoffDate = new Date(0); // Beginning of time
        break;
    }

    // Get all active agents
    const agents = queries.getActiveAgents() as Agent[];

    // Get equity snapshots for each agent within the time range
    const allSnapshots = agents.flatMap(agent => {
      const snapshots = db
        .prepare(
          `SELECT agent_id, balance, timestamp
           FROM equity_snapshots
           WHERE agent_id = ? AND timestamp >= ?
           ORDER BY timestamp ASC`
        )
        .all(agent.id, cutoffDate.toISOString()) as Array<{
        agent_id: string;
        balance: number;
        timestamp: string;
      }>;

      return snapshots;
    });

    // If no snapshots exist, create initial data point for each agent
    if (allSnapshots.length === 0) {
      const initialPoint: Record<string, any> = {
        timestamp: now.toISOString(),
      };

      agents.forEach(agent => {
        initialPoint[agent.id] = agent.balance;
      });

      return NextResponse.json([initialPoint]);
    }

    // Group snapshots by timestamp
    const groupedByTime = new Map<string, Record<string, number>>();

    // Add all snapshot data points
    allSnapshots.forEach(snapshot => {
      if (!groupedByTime.has(snapshot.timestamp)) {
        groupedByTime.set(snapshot.timestamp, {});
      }
      groupedByTime.get(snapshot.timestamp)![snapshot.agent_id] = snapshot.balance;
    });

    // Convert to array format for Recharts
    const chartData = Array.from(groupedByTime.entries())
      .map(([timestamp, agentBalances]) => ({
        timestamp,
        ...agentBalances,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Fill in missing agent data with last known balance or initial balance
    const lastKnownBalances: Record<string, number> = {};
    agents.forEach(agent => {
      // Use actual agent balance instead of hardcoded value
      lastKnownBalances[agent.id] = agent.balance;
    });

    const filledData = chartData.map((point: any) => {
      const filledPoint: Record<string, any> = { timestamp: point.timestamp };

      agents.forEach(agent => {
        if (point[agent.id] !== undefined) {
          filledPoint[agent.id] = point[agent.id];
          lastKnownBalances[agent.id] = point[agent.id] as number;
        } else {
          // Use last known balance if this agent doesn't have a snapshot at this time
          filledPoint[agent.id] = lastKnownBalances[agent.id];
        }
      });

      return filledPoint;
    });

    return NextResponse.json(filledData);
  } catch (error) {
    console.error('Error fetching equity snapshots:', error);
    return NextResponse.json({ error: 'Failed to fetch equity data' }, { status: 500 });
  }
}
