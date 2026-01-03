import * as crypto from 'crypto'

/**
 * Generate a secure random API key
 * Returns a base64-encoded 32-byte random string (44 characters)
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(32)
  return randomBytes.toString('base64')
}

