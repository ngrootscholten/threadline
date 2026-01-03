import PostgresAdapter from "@auth/pg-adapter"
import { getPool } from "../db"

/**
 * Get NextAuth adapter instance
 * Reuses the same adapter creation logic as NextAuth config
 */
export function getAdapter() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set")
  }
  return PostgresAdapter(getPool())
}

