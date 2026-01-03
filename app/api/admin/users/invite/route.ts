import { NextRequest, NextResponse } from "next/server"
import { auth } from "../../../auth/[...nextauth]/route"
import { getPool } from "../../../../lib/db"
import { requireAccountAdminResponse } from "../../../../lib/auth/admin"
import { parseEmails } from "../../../../lib/utils/email-parser"
import { sendMagicLink } from "../../../../lib/auth/send-magic-link"

/**
 * POST /api/admin/users/invite
 * Invite users to the account by email
 * Creates user records if they don't exist, links them to account, and sends magic links
 * Only accessible to account admins
 */
export async function POST(req: NextRequest) {
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

    const { emails: emailInput } = await req.json()

    if (!emailInput || typeof emailInput !== "string") {
      return NextResponse.json(
        { error: "Emails input is required" },
        { status: 400 }
      )
    }

    // Parse emails from various formats
    const emails = parseEmails(emailInput)

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "No valid emails found" },
        { status: 400 }
      )
    }

    const pool = getPool()
    const errors: string[] = []
    let invited = 0

    // Get account info
    const accountResult = await pool.query(
      `SELECT id, identifier FROM threadline_accounts WHERE id = $1`,
      [accountId]
    )

    if (accountResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Account not found" },
        { status: 404 }
      )
    }

    // Process each email
    for (const email of emails) {
      try {
        // Check if user already exists
        const existingUser = await pool.query(
          `SELECT id, account_id FROM users WHERE email = $1`,
          [email]
        )

        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0]
          
          // If user exists but belongs to different account, skip
          if (user.account_id && user.account_id !== accountId) {
            errors.push(`${email}: User already belongs to another account`)
            continue
          }

          // If user exists and belongs to this account, just send magic link
          if (user.account_id === accountId) {
            await sendMagicLink(email, accountId)
            invited++
            continue
          }

          // If user exists but has no account, link them
          await pool.query(
            `UPDATE users SET account_id = $1, role = 'regular_user' WHERE id = $2`,
            [accountId, user.id]
          )
          await sendMagicLink(email, accountId)
          invited++
        } else {
          // Create new user
          const newUserResult = await pool.query(
            `INSERT INTO users (email, account_id, role, is_active)
             VALUES ($1, $2, 'regular_user', true)
             RETURNING id`,
            [email, accountId]
          )

          const userId = newUserResult.rows[0].id

          // Send magic link
          await sendMagicLink(email, accountId)
          invited++
        }
      } catch (error: any) {
        console.error(`Error inviting ${email}:`, error)
        errors.push(`${email}: ${error.message || "Failed to invite"}`)
      }
    }

    return NextResponse.json({
      success: true,
      invited,
      total: emails.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error("Error inviting users:", error)
    return NextResponse.json(
      { error: error.message || "Failed to invite users" },
      { status: 500 }
    )
  }
}

