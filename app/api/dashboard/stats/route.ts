import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getPool } from '@/app/lib/db';

/**
 * GET /api/dashboard/stats
 * Returns comprehensive statistics for the dashboard
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

    // Calculate all stats in parallel queries
    const [
      totalChecksResult,
      linesReviewedResult,
      violationsResult,
      uniqueReposResult,
      compliantResult,
      filesReviewedResult,
      checksThisWeekResult,
      environmentBreakdownResult
    ] = await Promise.all([
      // Total checks
      pool.query(
        `SELECT COUNT(*) as total FROM checks WHERE account_id = $1`,
        [accountId]
      ),
      // Total lines reviewed
      pool.query(
        `SELECT 
          COALESCE(SUM(diff_lines_added), 0) as added,
          COALESCE(SUM(diff_lines_removed), 0) as removed
        FROM checks WHERE account_id = $1`,
        [accountId]
      ),
      // Violations caught
      pool.query(
        `SELECT COUNT(*) as total
        FROM check_results cr
        INNER JOIN check_threadlines ct ON cr.check_threadline_id = ct.id
        WHERE cr.status = 'attention' AND cr.account_id = $1`,
        [accountId]
      ),
      // Unique repositories
      pool.query(
        `SELECT COUNT(DISTINCT repo_name) as total
        FROM checks
        WHERE account_id = $1 AND repo_name IS NOT NULL`,
        [accountId]
      ),
      // Compliant checks
      pool.query(
        `SELECT COUNT(*) as total
        FROM check_results cr
        INNER JOIN check_threadlines ct ON cr.check_threadline_id = ct.id
        WHERE cr.status = 'compliant' AND cr.account_id = $1`,
        [accountId]
      ),
      // Total files reviewed
      pool.query(
        `SELECT COALESCE(SUM(files_changed_count), 0) as total
        FROM checks WHERE account_id = $1`,
        [accountId]
      ),
      // Checks this week
      pool.query(
        `SELECT COUNT(*) as total
        FROM checks
        WHERE account_id = $1 AND created_at >= NOW() - INTERVAL '7 days'`,
        [accountId]
      ),
      // Environment breakdown (CI/CD vs Local)
      pool.query(
        `SELECT 
          COUNT(CASE WHEN environment IN ('github', 'gitlab', 'vercel') THEN 1 END) as cicd,
          COUNT(CASE WHEN environment = 'local' THEN 1 END) as local
        FROM checks
        WHERE account_id = $1`,
        [accountId]
      )
    ]);

    const totalChecks = parseInt(totalChecksResult.rows[0].total) || 0;
    const linesAdded = parseInt(linesReviewedResult.rows[0].added) || 0;
    const linesRemoved = parseInt(linesReviewedResult.rows[0].removed) || 0;
    const totalLinesReviewed = linesAdded + linesRemoved;
    const violationsCaught = parseInt(violationsResult.rows[0].total) || 0;
    const uniqueRepos = parseInt(uniqueReposResult.rows[0].total) || 0;
    const compliantChecks = parseInt(compliantResult.rows[0].total) || 0;
    const totalFilesReviewed = parseInt(filesReviewedResult.rows[0].total) || 0;
    const checksThisWeek = parseInt(checksThisWeekResult.rows[0].total) || 0;
    const cicdChecks = parseInt(environmentBreakdownResult.rows[0].cicd) || 0;
    const localChecks = parseInt(environmentBreakdownResult.rows[0].local) || 0;

    // Calculate compliance rate
    const totalResults = violationsCaught + compliantChecks;
    const complianceRate = totalResults > 0 
      ? Math.round((compliantChecks / totalResults) * 100) 
      : 0;

    return NextResponse.json({
      statistics: {
        totalChecks,
        totalLinesReviewed,
        violationsCaught,
        uniqueRepos,
        complianceRate,
        totalFilesReviewed,
        checksThisWeek,
        cicdChecks,
        localChecks
      }
    });
  } catch (error: unknown) {
    console.error('Error fetching dashboard statistics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch dashboard statistics';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

