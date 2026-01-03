import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../auth/[...nextauth]/route"
import { getPool } from "../../../lib/db"
import { requireAccountAdminResponse } from "../../../lib/auth/admin"

/**
 * GET /api/admin/users
 * List all users for the current account
 * Only accessible to account admins
 */
export async function GET(req: NextRequest) {
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

    const pool = getPool()
    const result = await pool.query(
      `SELECT 
        id, 
        email, 
        name, 
        role, 
        is_active, 
        created_at, 
        "emailVerified"
      FROM users 
      WHERE account_id = $1 
      ORDER BY created_at DESC`,
      [accountId]
    )

    const users = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role || "account_admin",
      isActive: row.is_active,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      emailVerified: row.emailVerified ? new Date(row.emailVerified).toISOString() : null,
    }))

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

