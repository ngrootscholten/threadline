import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../../auth/[...nextauth]/route"
import { getPool } from "../../../../../lib/db"
import { requireAccountAdminResponse } from "../../../../../lib/auth/admin"

/**
 * POST /api/admin/users/[id]/activate
 * Activate a user (set is_active = true)
 * Only accessible to account admins
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth()
    
    // Check admin access
    const adminCheck = requireAccountAdminResponse(session)
    if (adminCheck) {
      return adminCheck
    }

    const accountId = (session!.user as any).accountId
    if (!accountId) {
      return NextResponse.json(
        { error: "User account not found" },
        { status: 404 }
      )
    }

    // Handle params as Promise (Next.js 15+) or direct object (Next.js 14)
    const resolvedParams = params instanceof Promise ? await params : params
    const userId = resolvedParams.id
    const pool = getPool()

    // Verify user belongs to the same account
    const userCheck = await pool.query(
      `SELECT id, account_id FROM users WHERE id = $1 AND account_id = $2`,
      [userId, accountId]
    )

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found or does not belong to this account" },
        { status: 404 }
      )
    }

    // Activate user
    await pool.query(
      `UPDATE users SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [userId]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error activating user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to activate user" },
      { status: 500 }
    )
  }
}

