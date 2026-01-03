import { NextRequest, NextResponse } from "next/server"
import { getPool } from "../../../lib/db"
import { createHash } from "crypto"
import { encode } from "next-auth/jwt"
import { auth } from "../[...nextauth]/route"

/**
 * POST /api/auth/confirm-signin
 * Validates magic link token and creates a session
 * This endpoint is called from the /auth/confirm page when user clicks "Confirm Sign In"
 */
export async function POST(req: NextRequest) {
  try {
    if (!process.env.NEXTAUTH_SECRET) {
      throw new Error("NEXTAUTH_SECRET environment variable is not set")
    }

    const { token, email, callbackUrl } = await req.json()

    if (!token || !email) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      )
    }

    console.log("🔐 Confirming sign-in for:", email)

    // Check if already signed in as this user
    // In NextAuth v5, use auth() instead of getServerSession()
    const existingSession = await auth()
    if (existingSession?.user?.email) {
      if (existingSession.user.email.toLowerCase() === email.toLowerCase()) {
        console.log("✅ User already signed in, skipping token verification")
        return NextResponse.json({
          success: true,
          alreadySignedIn: true,
          callbackUrl: callbackUrl || "/dashboard",
          user: {
            id: (existingSession.user as any).id || "",
            email: existingSession.user.email,
            name: existingSession.user.name || "",
          },
        })
      }
    }

    // Hash the token the same way NextAuth does
    const hashedToken = createHash("sha256")
      .update(`${token}${process.env.NEXTAUTH_SECRET}`)
      .digest("hex")

    const pool = getPool()

    // Look up the verification token in the database
    const tokenResult = await pool.query(
      `SELECT * FROM verification_token 
       WHERE identifier = $1 AND token = $2 AND expires > NOW()`,
      [email, hashedToken]
    )

    if (tokenResult.rows.length === 0) {
      console.log("❌ Token not found or expired for:", email)
      return NextResponse.json(
        { error: "Invalid or expired token. Please request a new sign-in link." },
        { status: 400 }
      )
    }

    // Token is valid! Now look up the user
    const userResult = await pool.query(
      `SELECT id, email, name, company, role, is_active, account_id FROM users WHERE email = $1`,
      [email]
    )

    if (userResult.rows.length === 0) {
      console.log("❌ User not found:", email)
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      )
    }

    const user = userResult.rows[0]

    // Check if user is active
    if (user.is_active === false) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 }
      )
    }

    // Mark the user as verified if they aren't already (NextAuth uses camelCase)
    await pool.query(
      `UPDATE users SET "emailVerified" = NOW() WHERE id = $1 AND "emailVerified" IS NULL`,
      [user.id]
    )

    // Delete the verification token (it's been used)
    await pool.query(
      `DELETE FROM verification_token WHERE identifier = $1 AND token = $2`,
      [email, hashedToken]
    )

    console.log("✅ Token verified and consumed for:", email)

    // Determine cookie name (must match salt for NextAuth v5)
    // In NextAuth v5, the salt parameter is REQUIRED and must match the cookie name
    const cookieName = process.env.NODE_ENV === "production"
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token"

    // Generate JWT session token using NextAuth's encoder
    // Keep it SIMPLE - just use what NextAuth's encode function expects
    // Include accountId and company for our app's needs
    // CRITICAL: salt parameter is required in NextAuth v5 and must match cookie name
    // CRITICAL: Must include 'id' field - NextAuth's session callback looks for token.id
    const sessionToken = await encode({
      token: {
        sub: user.id,
        id: user.id, // Required! Session callback checks token.id
        email: user.email,
        name: user.name,
        role: user.role || "account_admin",
        // Include our custom fields - NextAuth's jwt callback will handle these
        accountId: user.account_id || null,
        company: user.company || null,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      maxAge: 14 * 24 * 60 * 60, // 2 weeks
      salt: cookieName, // Required in NextAuth v5!
    })

    const finalCallbackUrl = callbackUrl || "/dashboard"

    console.log("✅ User signed in:", email, "- Redirecting to:", finalCallbackUrl)

    // Set the NextAuth session cookie IN THE RESPONSE (cookie name already defined above)

    const response = NextResponse.json({
      success: true,
      callbackUrl: finalCallbackUrl,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })

    // Set cookie in response headers with EXACT same settings as NextAuth
    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 14 * 24 * 60 * 60, // 2 weeks
    })

    return response
  } catch (error: any) {
    console.error("❌ Confirm sign-in error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to sign in" },
      { status: 500 }
    )
  }
}

