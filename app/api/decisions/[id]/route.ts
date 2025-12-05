import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const db = getDb();

        // Get decision with agent and model info
        const decision = db.prepare(`
      SELECT 
        d.*,
        mod.display_name as model_name,
        mod.color as model_color,
        mod.provider as model_provider,
        mod.id as model_id
      FROM decisions d
      JOIN agents a ON d.agent_id = a.id
      JOIN models mod ON a.model_id = mod.id
      WHERE d.id = ?
    `).get(id);

        if (!decision) {
            return NextResponse.json(
                { error: 'Decision not found' },
                { status: 404 }
            );
        }

// Get trades associated with this decision, including market info
    // Only return trades that have a valid decision_id
    const trades = db.prepare(`
      SELECT 
        t.*,
        m.question as market_question,
        m.slug as market_slug,
        m.event_slug as market_event_slug,
        t.market_id
      FROM trades t
      JOIN markets m ON t.market_id = m.id
      JOIN decisions d ON t.decision_id = d.id
      WHERE t.decision_id = ?
    `).all(id);

        return NextResponse.json({
            decision,
            trades // Return array of trades
        });

    } catch (error) {
        console.error('Error fetching decision:', error);
        return NextResponse.json(
            { error: 'Failed to fetch decision' },
            { status: 500 }
        );
    }
}
