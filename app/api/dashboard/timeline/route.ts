import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getPool } from '@/app/lib/db';

/**
 * GET /api/dashboard/timeline
 * Returns daily bins of checks for the last 90 days
 * Each bin contains an array of check objects with outcome, repo, environment, and threadline info
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
    
    // Get account_id from session
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;

    // Get all checks from the last 90 days
    // Return raw timestamps - client will bin by local timezone
    const checksResult = await pool.query(
      `SELECT 
        c.id,
        c.created_at,
        c.repo_name,
        c.environment,
        -- Aggregate outcomes: if any threadline has 'attention', the check has violations
        -- Otherwise if any has 'compliant', it's compliant, else 'not_relevant'
        CASE 
          WHEN COUNT(CASE WHEN cr.status = 'attention' THEN 1 END) > 0 THEN 'attention'
          WHEN COUNT(CASE WHEN cr.status = 'compliant' THEN 1 END) > 0 THEN 'compliant'
          ELSE 'not_relevant'
        END as outcome,
        -- Get unique threadline IDs (human-readable names) for this check
        ARRAY_AGG(DISTINCT td.threadline_id) FILTER (WHERE td.threadline_id IS NOT NULL) as threadline_ids
      FROM checks c
      LEFT JOIN check_threadlines ct ON c.id = ct.check_id AND ct.account_id = $1
      LEFT JOIN threadline_definitions td ON ct.threadline_definition_id = td.id AND td.account_id = $1
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id AND cr.account_id = $1
      WHERE c.account_id = $1 
        AND c.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY c.id, c.created_at, c.repo_name, c.environment
      ORDER BY c.created_at ASC`,
      [accountId]
    );

    // Return raw check data with ISO timestamps - client will bin by local timezone
    const checks = checksResult.rows.map(row => ({
      id: row.id,
      createdAt: row.created_at.toISOString(),  // Convert to ISO string on server
      outcome: row.outcome || 'not_relevant',
      repoName: row.repo_name,
      environment: row.environment,
      threadlineIds: row.threadline_ids || []
    }));

    return NextResponse.json({
      checks
    });
  } catch (error: unknown) {
    console.error('Error fetching dashboard timeline:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard timeline';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

