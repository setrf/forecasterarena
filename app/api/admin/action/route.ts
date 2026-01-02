/**
 * Admin Action Proxy Endpoint
 * 
 * Allows authenticated admin users to trigger cron actions
 * by proxying requests with proper CRON_SECRET authorization.
 * 
 * @route POST /api/admin/action
 */

import { NextRequest, NextResponse } from 'next/server';
import { maybeStartNewCohort } from '@/lib/engine/cohort';
import { syncMarkets } from '@/lib/engine/market';
import { logSystemEvent } from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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
                // Use WAL-safe backup via SQLite's backup API
                const { createBackup } = await import('@/lib/db');
                const backupPath = createBackup();

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
