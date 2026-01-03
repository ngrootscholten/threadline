import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../auth/[...nextauth]/route"
import { getPool } from "../../../../lib/db"
import { requireAccountAdminResponse } from "../../../../lib/auth/admin"

/**
 * PATCH /api/admin/users/[id]
 * Update user name and/or role
 * Only accessible to account admins
 */
export async function PATCH(
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
    const { name, role } = await req.json()

    // Validate role if provided
    if (role !== undefined && role !== null) {
      if (role !== "account_admin" && role !== "regular_user") {
        return NextResponse.json(
          { error: "Invalid role. Must be 'account_admin' or 'regular_user'" },
          { status: 400 }
        )
      }
    }

    const pool = getPool()

    // Debug: Check if user exists and what their account_id is
    const debugCheck = await pool.query(
      `SELECT id, account_id, email FROM users WHERE id = $1`,
      [userId]
    )

    if (debugCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const userAccountId = debugCheck.rows[0].account_id

    // Verify user belongs to the same account
    if (!userAccountId || userAccountId !== accountId) {
      console.error(`Account mismatch: user account_id=${userAccountId}, session accountId=${accountId}, userId=${userId}, userEmail=${debugCheck.rows[0].email}`)
      return NextResponse.json(
        { error: "User not found or does not belong to this account" },
        { status: 404 }
      )
    }

    const userCheck = debugCheck

    // Check if trying to change role - prevent removing last account admin
    if (role && role !== userCheck.rows[0].role) {
      const adminCount = await pool.query(
        `SELECT COUNT(*) as count FROM users WHERE account_id = $1 AND role = 'account_admin' AND is_active = true`,
        [accountId]
      )

      if (adminCount.rows[0].count <= 1 && userCheck.rows[0].role === "account_admin") {
        return NextResponse.json(
          { error: "Cannot remove the last account admin" },
          { status: 400 }
        )
      }
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`)
      values.push(name || null)
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`)
      values.push(role)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      )
    }

    updates.push(`updated_at = NOW()`)
    values.push(userId)

    await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`,
      values
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error.message || "Failed to update user" },
      { status: 500 }
    )
  }
}

