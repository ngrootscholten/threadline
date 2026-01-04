import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getPool } from '@/app/lib/db';
import { filterDiffByFiles } from '@/app/lib/utils/diff-filter';
import { combineDiffs } from '@/app/lib/utils/combine-diffs';

/**
 * GET /api/fixes/[id]/diff
 * Returns the combined diff for a specific fix, showing introduction and removal
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

    const { id: fixId } = await params;
    const pool = getPool();
    
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;

    // Get fix details
    const fixResult = await pool.query(
      `SELECT 
         f.id,
         f.previous_check_id,
         f.current_check_id,
         f.violation_file_references
       FROM fixes f
       WHERE f.account_id = $1
         AND f.id = $2`,
      [accountId, fixId]
    );

    if (fixResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Fix not found' },
        { status: 404 }
      );
    }

    const fix = fixResult.rows[0];

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

    // Filter diffs to violation files only
    const violationFiles = Array.isArray(fix.violation_file_references)
      ? fix.violation_file_references
      : [];
    
    const previousDiffFiltered = filterDiffByFiles(previousDiff, violationFiles);
    const currentDiffFiltered = filterDiffByFiles(currentDiff, violationFiles);

    // Combine diffs to show introduction and removal in unified view
    const combinedDiff = combineDiffs(
      previousDiffFiltered,
      currentDiffFiltered,
      violationFiles
    );

    return NextResponse.json({
      diff: combinedDiff,
      previous_diff_filtered: previousDiffFiltered,
      current_diff_filtered: currentDiffFiltered
    });

  } catch (err: any) {
    console.error('Failed to fetch fix diff:', err);
    return NextResponse.json(
      { error: 'Failed to fetch fix diff', details: err.message },
      { status: 500 }
    );
  }
}

