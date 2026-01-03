import { Session } from "next-auth"
import { NextResponse } from "next/server"

/**
 * Check if the current session user is an account admin
 * Throws an error if not an admin (for use in API routes)
 */
export function requireAccountAdmin(session: Session | null): void {
  if (!session?.user) {
    throw new Error("Not authenticated")
  }

  const role = (session.user as any).role
  if (role !== "account_admin") {
    throw new Error("Access denied: Account admin role required")
  }
}

/**
 * Check if the current session user is an account admin
 * Returns a NextResponse error if not an admin (for use in API routes)
 */
export function requireAccountAdminResponse(session: Session | null): NextResponse | null {
  if (!session?.user) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    )
  }

  const role = (session.user as any).role
  if (role !== "account_admin") {
    return NextResponse.json(
      { error: "Access denied: Account admin role required" },
      { status: 403 }
    )
  }

  return null
}

