import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { getPool } from '@/app/lib/db';

/**
 * POST /api/checks/[id]/detect-fixes
 * Naive fix detection: If violation existed in previous check and doesn't exist
 * in current check, assume CODE_CHANGE fix.
 */
export async function POST(
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

    const { id: currentCheckId } = await params;
    const pool = getPool();
    
    if (!session.user.accountId) {
      return NextResponse.json(
        { error: 'User account not found' },
        { status: 404 }
      );
    }
    
    const accountId = session.user.accountId;

    // 1. Get current check details
    const currentCheckResult = await pool.query(
      `SELECT id, account_id, repo_name, branch_name, environment, created_at
       FROM checks
       WHERE id = $1 AND account_id = $2`,
      [currentCheckId, accountId]
    );

    if (currentCheckResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Check not found' },
        { status: 404 }
      );
    }

    const currentCheck = currentCheckResult.rows[0];

    // 2. Find previous check (using IS NOT DISTINCT FROM for NULL handling)
    const previousCheckResult = await pool.query(
      `SELECT id, created_at
       FROM checks
       WHERE account_id = $1
         AND repo_name IS NOT DISTINCT FROM $2
         AND branch_name IS NOT DISTINCT FROM $3
         AND environment = $4
         AND created_at < $5
       ORDER BY created_at DESC
       LIMIT 1`,
      [
        accountId,
        currentCheck.repo_name,
        currentCheck.branch_name,
        currentCheck.environment,
        currentCheck.created_at
      ]
    );

    if (previousCheckResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        fixesDetected: 0,
        message: 'No previous check found'
      });
    }

    const previousCheck = previousCheckResult.rows[0];
    const timeBetweenSeconds = Math.floor(
      (new Date(currentCheck.created_at).getTime() - 
       new Date(previousCheck.created_at).getTime()) / 1000
    );

    // 3. Get violations from previous check (status = 'attention')
    const violationsResult = await pool.query(
      `SELECT 
         cr.id as check_result_id,
         cr.file_references,
         cr.reasoning,
         ct.id as check_threadline_id,
         ct.threadline_id,
         td.identity_hash,
         td.threadline_file_path
       FROM check_results cr
       JOIN check_threadlines ct ON cr.check_threadline_id = ct.id
       JOIN threadline_definitions td ON ct.threadline_definition_id = td.id
       WHERE cr.account_id = $1
         AND ct.check_id = $2
         AND cr.status = 'attention'`,
      [accountId, previousCheck.id]
    );

    if (violationsResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        fixesDetected: 0,
        message: 'No violations in previous check'
      });
    }

    const violations = violationsResult.rows;
    const fixesDetected: any[] = [];

    // 4. For each violation, check if it's fixed in current check
    for (const violation of violations) {
      // Check if current check has same threadline (by identity_hash) without violation
      const currentThreadlineResult = await pool.query(
        `SELECT ct.id, cr.status
         FROM check_threadlines ct
         JOIN threadline_definitions td ON ct.threadline_definition_id = td.id
         LEFT JOIN check_results cr ON cr.check_threadline_id = ct.id
         WHERE ct.check_id = $1
           AND ct.account_id = $2
           AND td.identity_hash = $3`,
        [currentCheckId, accountId, violation.identity_hash]
      );

      const currentThreadline = currentThreadlineResult.rows[0];
      
      // If threadline doesn't exist OR exists but no violation (status != 'attention' or NULL)
      const isFixed = !currentThreadline || 
                      !currentThreadline.status || 
                      currentThreadline.status !== 'attention';

      if (isFixed) {
        // Insert fix record
        const fixResult = await pool.query(
          `INSERT INTO fixes (
            account_id,
            previous_check_id,
            current_check_id,
            previous_check_threadline_id,
            current_check_threadline_id,
            previous_check_result_id,
            threadline_identity_hash,
            threadline_id,
            threadline_file_path,
            violation_file_references,
            violation_reasoning,
            fix_type,
            time_between_checks_seconds,
            detection_method
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id`,
          [
            accountId,
            previousCheck.id,
            currentCheckId,
            violation.check_threadline_id,
            currentThreadline?.id || null,
            violation.check_result_id,
            violation.identity_hash,
            violation.threadline_id,
            violation.threadline_file_path,
            JSON.stringify(violation.file_references),
            violation.reasoning,
            'CODE_CHANGE', // Naive: always assume code change
            timeBetweenSeconds,
            'naive'
          ]
        );

        fixesDetected.push({
          id: fixResult.rows[0].id,
          threadline_id: violation.threadline_id,
          fix_type: 'CODE_CHANGE'
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixesDetected: fixesDetected.length,
      fixes: fixesDetected
    });

  } catch (err: any) {
    console.error('Fix detection error:', err);
    return NextResponse.json(
      { error: 'Failed to detect fixes', details: err.message },
      { status: 500 }
    );
  }
}

