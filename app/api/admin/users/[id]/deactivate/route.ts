import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/app/api/auth/[...nextauth]/route"
import { getPool } from "@/app/lib/db"
import { requireAccountAdminResponse } from "@/app/lib/auth/admin"

/**
 * POST /api/admin/users/[id]/deactivate
 * Deactivate a user (set is_active = false)
 * Only accessible to account admins
 * Prevents deactivating yourself
 * Prevents deactivating the last account admin
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

    // Prevent users from deactivating themselves
    const currentUserId = (session!.user as any).id
    if (currentUserId === userId) {
      return NextResponse.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      )
    }

    // Verify user belongs to the same account
    const userCheck = await pool.query(
      `SELECT id, account_id, role FROM users WHERE id = $1 AND account_id = $2`,
      [userId, accountId]
    )

    if (userCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found or does not belong to this account" },
        { status: 404 }
      )
    }

    // Prevent deactivating the last account admin
    if (userCheck.rows[0].role === "account_admin") {
      const adminCount = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE account_id = $1 AND role = 'account_admin' AND is_active = true`,
        [accountId]
      )

      if (adminCount.rows[0].count <= 1) {
        return NextResponse.json(
          { error: "Cannot deactivate the last account admin" },
          { status: 400 }
        )
      }
    }

    // Deactivate user
    await pool.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [userId]
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deactivating user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to deactivate user" },
      { status: 500 }
    )
  }
}

