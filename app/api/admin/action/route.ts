/**
 * Admin Action Proxy Endpoint
 * 
 * Allows authenticated admin users to trigger cron actions
 * by proxying requests with proper CRON_SECRET authorization.
 * 
 * @route POST /api/admin/action
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_PASSWORD, CRON_SECRET } from '@/lib/constants';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { syncMarkets } from '@/lib/engine/market';
import { logSystemEvent } from '@/lib/db';
import { checkAndCompleteCohorts } from '@/lib/engine/cohort';

export const dynamic = 'force-dynamic';

import { createHmac } from 'crypto';

function isAuthenticated(): boolean {
    try {
        const cookieStore = cookies();
        const tokenCookie = cookieStore.get('forecaster_admin');

        if (!tokenCookie?.value) return false;

        const decoded = Buffer.from(tokenCookie.value, 'base64').toString('utf8');
        const parts = decoded.split(':');

        if (parts.length !== 3) return false;

        const [role, timestamp, signature] = parts;

        if (role !== 'admin') return false;

        const payload = `${role}:${timestamp}`;
        const expectedSignature = createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('hex');

        return signature === expectedSignature;
    } catch {
        return false;
    }
}

export async function POST(request: NextRequest) {
    if (!isAuthenticated()) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { action, force } = body;

        switch (action) {
            case 'start-cohort': {
                const result = maybeStartNewCohort(force === true);

                if (result.success && result.cohort) {
                    logSystemEvent('admin_start_cohort', {
                        cohort_number: result.cohort.cohort_number,
                        agents_created: result.agents?.length || 0
                    }, 'info');

                    return NextResponse.json({
                        success: true,
                        cohort_id: result.cohort.id,
                        cohort_number: result.cohort.cohort_number,
                        agents_created: result.agents?.length || 0
                    });
                } else {
                    return NextResponse.json({
                        success: false,
                        message: result.error || 'Conditions not met for new cohort'
                    });
                }
            }

            case 'sync-markets': {
                const result = await syncMarkets();

                logSystemEvent('admin_sync_markets', {
                    markets_added: result.markets_added,
                    markets_updated: result.markets_updated
                }, 'info');

                return NextResponse.json({
                    success: true,
                    markets_added: result.markets_added,
                    markets_updated: result.markets_updated
                });
            }

            case 'check-cohorts': {
                const { checkAndCompleteCohorts } = await import('@/lib/engine/cohort');
                const completedCount = checkAndCompleteCohorts();
                
                logSystemEvent('admin_check_cohorts', {
                    cohorts_checked: completedCount
                }, 'info');
                
                return NextResponse.json({
                    success: true,
                    cohorts_completed: completedCount
                });
            }
            
            case 'backup': {
                // Import backup function dynamically to avoid issues
                const fs = await import('fs');
                const path = await import('path');
                
                const dbPath = path.join(process.cwd(), 'data', 'forecaster.db');
                const backupDir = path.join(process.cwd(), 'data', 'backups');
                
                // Create backups directory if it doesn't exist
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const backupPath = path.join(backupDir, `forecaster_${timestamp}.db`);
                
                fs.copyFileSync(dbPath, backupPath);
                
                logSystemEvent('admin_backup', { backup_path: backupPath }, 'info');
                
                return NextResponse.json({
                    success: true,
                    backup_path: backupPath
                });
            }

            default:
                return NextResponse.json(
                    { error: 'Unknown action' },
                    { status: 400 }
                );
        }

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        logSystemEvent('admin_action_error', { error: message }, 'error');

        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
