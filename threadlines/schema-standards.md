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

**Always use `TIMESTAMPTZ`, never `TIMESTAMP`.**

```sql
-- ✅ Good
created_at TIMESTAMPTZ DEFAULT NOW()
expires TIMESTAMPTZ NOT NULL

-- ❌ Bad
created_at TIMESTAMP DEFAULT NOW()
expires TIMESTAMP NOT NULL
```

### 2. Column Naming Convention

**Our columns: snake_case (lowercase_with_underscores). NextAuth columns: camelCase in quotes.**

```sql
-- ✅ Good
created_at TIMESTAMPTZ
api_key_hash TEXT
"emailVerified" TIMESTAMPTZ  -- NextAuth (quoted camelCase)

-- ❌ Bad
RelevantFiles JSONB          -- Capital letters
filteredDiff TEXT            -- camelCase
createdAt TIMESTAMPTZ        -- camelCase
```

### 3. Row Level Security (RLS) Must Be Enabled

**Every table must have RLS enabled. No policies that allow public access.**

```sql
-- ✅ Good
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

-- ❌ Bad - Missing RLS
CREATE TABLE checks (...);
-- No ALTER TABLE ... ENABLE ROW LEVEL SECURITY

-- ❌ Bad - Policy opens access
CREATE POLICY "Allow public read" ON checks FOR SELECT USING (true);
```

## Summary

- Timestamps: `TIMESTAMPTZ` only
- Column names: `snake_case` for our columns, `"camelCase"` (quoted) for NextAuth
- RLS: Enabled on all tables, no public access policies

