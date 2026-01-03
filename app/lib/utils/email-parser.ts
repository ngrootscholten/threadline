/**
 * Parse emails from various formats:
 * - Line-separated: "email1@example.com\nemail2@example.com"
 * - Comma-separated: "email1@example.com, email2@example.com"
 * - Semicolon-separated: "email1@example.com; email2@example.com"
 * - Outlook format: "John Doe" <john@example.com>
 * - Mixed formats
 */

/**
 * Extract email from Outlook format: "Name" <email@example.com>
 */
function extractEmailFromOutlookFormat(text: string): string | null {
  // Match Outlook format: "Name" <email@example.com>
  const outlookMatch = text.match(/<([^>]+)>/)
  if (outlookMatch && outlookMatch[1]) {
    return outlookMatch[1].trim()
  }
  return null
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Parse emails from a text input string
 * Handles multiple formats and returns a deduplicated array of valid emails
 */
export function parseEmails(input: string): string[] {
  if (!input || typeof input !== "string") {
    return []
  }

  // Split by common delimiters: newlines, commas, semicolons
  const parts = input
    .split(/[\n\r,;]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  const emails: string[] = []

  for (const part of parts) {
    // Try Outlook format first
    const outlookEmail = extractEmailFromOutlookFormat(part)
    if (outlookEmail && isValidEmail(outlookEmail)) {
      emails.push(outlookEmail.toLowerCase())
      continue
    }

    // Otherwise, treat the whole part as an email
    if (isValidEmail(part)) {
      emails.push(part.toLowerCase())
    }
  }

  // Deduplicate
  return Array.from(new Set(emails))
}

