import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getPool } from '@/app/lib/db';

/**
 * GET /api/metrics
 * Returns all check_metrics for the authenticated account
 * Simple endpoint - returns raw data for frontend processing
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const pool = getPool();
    
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;

    // Get all metrics for this account, ordered by recorded_at
    // JOIN with checks table to get environment
    // SECURITY: Must filter checks by account_id to prevent cross-account data leakage
    const metricsResult = await pool.query(
      `SELECT 
         cm.id,
         cm.check_id,
         cm.check_threadline_id,
         cm.metric_type,
         cm.metrics,
         cm.recorded_at,
         cm.created_at,
         c.environment
       FROM check_metrics cm
       LEFT JOIN checks c ON cm.check_id = c.id AND c.account_id = $1
       WHERE cm.account_id = $1
       ORDER BY cm.recorded_at ASC`,
      [accountId]
    );

    return NextResponse.json({
      metrics: metricsResult.rows
    });

  } catch (err: any) {
    console.error('Failed to fetch metrics:', err);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: err.message },
      { status: 500 }
    );
  }
}

