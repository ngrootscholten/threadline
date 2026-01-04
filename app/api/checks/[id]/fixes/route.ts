import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getPool } from '@/app/lib/db';
import { filterDiffByFiles } from '@/app/lib/utils/diff-filter';

/**
 * GET /api/checks/[id]/fixes
 * Returns fixes detected in this check (where current_check_id = checkId)
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
    
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;

    // Get fixes where this check is the current_check_id
    const fixesResult = await pool.query(
      `SELECT 
         f.id,
         f.previous_check_id,
         f.current_check_id,
         f.previous_check_threadline_id,
         f.current_check_threadline_id,
         f.threadline_id,
         f.threadline_file_path,
         f.violation_file_references,
         f.violation_reasoning,
         f.fix_type,
         f.explanation,
         f.evidence,
         f.time_between_checks_seconds,
         f.detection_method,
         f.created_at
       FROM fixes f
       WHERE f.account_id = $1
         AND f.current_check_id = $2
       ORDER BY f.created_at DESC`,
      [accountId, checkId]
    );

    // For each fix, fetch and process diffs
    const fixesWithDiffs = await Promise.all(
      fixesResult.rows.map(async (fix) => {
        // Get previous check diff
        const previousDiffResult = await pool.query(
          `SELECT diff_content FROM check_diffs WHERE check_id = $1`,
          [fix.previous_check_id]
        );
        const previousDiff = previousDiffResult.rows[0]?.diff_content || '';

        // Get current check diff
        const currentDiffResult = await pool.query(
          `SELECT diff_content FROM check_diffs WHERE check_id = $1`,
          [fix.current_check_id]
        );
        const currentDiff = currentDiffResult.rows[0]?.diff_content || '';

        // Filter previous diff to violation files only
        const violationFiles = Array.isArray(fix.violation_file_references)
          ? fix.violation_file_references
          : [];
        const previousDiffFiltered = filterDiffByFiles(previousDiff, violationFiles);

        return {
          ...fix,
          previous_diff_filtered: previousDiffFiltered,
          current_diff_full: currentDiff
        };
      })
    );

    return NextResponse.json({
      fixes: fixesWithDiffs
    });

  } catch (err: any) {
    console.error('Failed to fetch fixes:', err);
    return NextResponse.json(
      { error: 'Failed to fetch fixes', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/checks/[id]/fixes
 * Deletes all fixes for this check (where current_check_id = checkId)
 */
export async function DELETE(
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
    
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;

    // Delete fixes where this check is the current_check_id
    const deleteResult = await pool.query(
      `DELETE FROM fixes
       WHERE account_id = $1
         AND current_check_id = $2
       RETURNING id`,
      [accountId, checkId]
    );

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.rowCount
    });

  } catch (err: any) {
    console.error('Failed to delete fixes:', err);
    return NextResponse.json(
      { error: 'Failed to delete fixes', details: err.message },
      { status: 500 }
    );
  }
}

