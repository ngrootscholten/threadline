import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../auth/[...nextauth]/route';
import { getPool } from '../../../lib/db';

/**
 * GET /api/checks/[id]
 * Returns detailed information about a specific check
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { id: checkId } = await params;
    const pool = getPool();
    
    // Get check metadata
    // Allow access if user_id matches OR if account matches (for legacy env var auth)
    // Use AT TIME ZONE 'UTC' to explicitly mark timestamp as UTC before formatting
    const checkResult = await pool.query(
      `SELECT 
        c.id,
        c.repo_name,
        c.branch_name,
        c.commit_sha,
        c.review_context,
        c.diff_lines_added,
        c.diff_lines_removed,
        c.diff_total_lines,
        c.files_changed_count,
        c.context_files_count,
        c.context_files_total_lines,
        c.threadlines_count,
        TO_CHAR(c.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at_iso,
        c.account
      FROM checks c
      WHERE c.id = $1 AND (c.user_id = $2 OR c.account = $3)`,
      [checkId, session.user.id, session.user.email]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Check not found' },
        { status: 404 }
      );
    }

    const check = checkResult.rows[0];

    // Get diff content
    const diffResult = await pool.query(
      `SELECT diff_content, diff_format
       FROM check_diffs
       WHERE check_id = $1`,
      [checkId]
    );

    // Get threadlines and their results
    const threadlinesResult = await pool.query(
      `SELECT 
        ct.id as check_threadline_id,
        ct.threadline_id,
        ct.threadline_version,
        ct.threadline_patterns,
        ct.threadline_content,
        ct.context_files,
        ct.context_content,
        cr.id as result_id,
        cr.status,
        cr.reasoning,
        cr.file_references
      FROM check_threadlines ct
      LEFT JOIN check_results cr ON ct.id = cr.check_threadline_id
      WHERE ct.check_id = $1
      ORDER BY ct.created_at`,
      [checkId]
    );

    // Group threadlines with their results
    const threadlines = threadlinesResult.rows.map(row => ({
      checkThreadlineId: row.check_threadline_id,
      threadlineId: row.threadline_id,
      version: row.threadline_version,
      patterns: row.threadline_patterns,
      content: row.threadline_content,
      contextFiles: row.context_files,
      contextContent: row.context_content,
      result: row.result_id ? {
        id: row.result_id,
        status: row.status,
        reasoning: row.reasoning,
        fileReferences: row.file_references
      } : null
    }));

    return NextResponse.json({
      check: {
        id: check.id,
        repoName: check.repo_name,
        branchName: check.branch_name,
        commitSha: check.commit_sha,
        reviewContext: check.review_context,
        diffStats: {
          added: check.diff_lines_added,
          removed: check.diff_lines_removed,
          total: check.diff_total_lines
        },
        filesChangedCount: check.files_changed_count,
        contextFilesCount: check.context_files_count,
        contextFilesTotalLines: check.context_files_total_lines,
        threadlinesCount: check.threadlines_count,
        createdAt: check.created_at_iso, // Already formatted as ISO 8601 with 'Z' from PostgreSQL
        diff: diffResult.rows[0]?.diff_content || null,
        diffFormat: diffResult.rows[0]?.diff_format || 'unified',
        threadlines
      }
    });
  } catch (error: any) {
    console.error('Error fetching check details:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch check details' },
      { status: 500 }
    );
  }
}

