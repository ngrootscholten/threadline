---
id: schema-standards
version: 1.0.0
patterns:
  - "schema.sql"
context_files: []
---

# Database Schema Standards

This threadline enforces critical database schema standards for `schema.sql` to ensure consistency, security, and proper timezone handling.

## Rules

### 1. Timestamp Columns Must Use TIMESTAMPTZ

**All timestamp columns MUST use `TIMESTAMPTZ` (TIMESTAMP WITH TIME ZONE), never `TIMESTAMP`.**

- `TIMESTAMPTZ` stores timestamps in UTC internally, eliminating timezone ambiguity
- `TIMESTAMP` without timezone relies on server timezone assumptions, which can cause incorrect data
- This is the PostgreSQL industry standard for applications that display times to users

**Examples:**

```sql
-- ❌ Bad - TIMESTAMP without timezone
created_at TIMESTAMP DEFAULT NOW()
expires TIMESTAMP NOT NULL

-- ✅ Good - TIMESTAMPTZ with timezone
created_at TIMESTAMPTZ DEFAULT NOW()
expires TIMESTAMPTZ NOT NULL
```

### 2. Column Naming Convention

**All column names MUST use snake_case, EXCEPT columns required by the NextAuth Postgres adapter which MUST use camelCase.**

- NextAuth adapter requires specific camelCase column names (e.g., `emailVerified`, `sessionToken`, `userId`)
- All custom columns (our own fields) MUST use snake_case (e.g., `created_at`, `updated_at`, `api_key_hash`)
- Mixed naming is acceptable within the same table when required by NextAuth

**Examples:**

```sql
-- ✅ Good - Mixed naming for NextAuth compatibility
CREATE TABLE users (
  "emailVerified" TIMESTAMPTZ,  -- NextAuth required (camelCase)
  created_at TIMESTAMPTZ,       -- Our field (snake_case)
  api_key_hash TEXT             -- Our field (snake_case)
);

-- ❌ Bad - Using camelCase for our own fields
CREATE TABLE users (
  createdAt TIMESTAMPTZ  -- Should be created_at
);

-- ❌ Bad - Using snake_case for NextAuth required fields
CREATE TABLE users (
  email_verified TIMESTAMPTZ  -- NextAuth requires "emailVerified"
);
```

**NextAuth Required camelCase Columns:**
- `emailVerified` (users table)
- `sessionToken` (sessions table)
- `userId` (sessions, accounts tables)
- `providerAccountId` (accounts table)
- `session_state` (accounts table - note: this one is snake_case in adapter)

### 3. Row Level Security (RLS) Must Be Enabled

**ALL tables MUST have RLS enabled, and NO policies should be created that "open up" access.**

- RLS prevents Supabase's public API key from accessing data
- No exception policies should be created that allow public access
- All database access must go through server-side code using `DATABASE_URL`
- This is a zero-trust security model

**Examples:**

```sql
-- ✅ Good - RLS enabled, no policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

-- ❌ Bad - Missing RLS
CREATE TABLE checks (
  -- ... columns ...
);
-- No ALTER TABLE ... ENABLE ROW LEVEL SECURITY

-- ❌ Bad - RLS enabled but policy opens access
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON checks FOR SELECT USING (true);  -- Opens access!
```

## Verification Checklist

When reviewing or modifying `schema.sql`, verify:

- [ ] All timestamp columns use `TIMESTAMPTZ` (not `TIMESTAMP`)
- [ ] All custom columns use `snake_case` naming
- [ ] NextAuth required columns use `camelCase` (quoted to preserve case)
- [ ] Every `CREATE TABLE` statement has a corresponding `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- [ ] No `CREATE POLICY` statements exist that allow public access
- [ ] All tables have RLS enabled (check for `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)

## Rationale

1. **TIMESTAMPTZ**: Prevents timezone-related bugs, ensures consistent UTC storage, and aligns with PostgreSQL best practices for applications displaying times to users.

2. **Snake_case for custom columns**: Follows PostgreSQL conventions and improves readability. Mixed naming is acceptable only when required by external dependencies (NextAuth).

3. **RLS without policies**: Provides defense-in-depth security, preventing accidental data exposure via Supabase's public API. All access must be explicit through server-side code.

