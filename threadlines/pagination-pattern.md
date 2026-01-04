---
id: pagination-pattern
version: 1.0.0
patterns:
  - "app/**/*.tsx"
  - "app/**/*.ts"
  - "app/api/**/*.ts"
---

# Pagination Pattern Standards

## Description
All paginated pages in the Threadline application must follow consistent pagination patterns for both UI components and API endpoints to ensure a uniform user experience.

## UI Pattern

### Component Usage
- **Required**: Use the `<Pagination>` component from `app/components/pagination.tsx`
- **Forbidden**: Do not create custom pagination implementations
- **Pattern**: 
  ```tsx
  import { Pagination } from "../components/pagination";
  
  <Pagination
    page={pagination.page}
    totalPages={pagination.totalPages}
    total={pagination.total}
    limit={pagination.limit}
    itemName="threadline" // or "check", etc.
    onPageChange={handlePageChange}
  />
  ```

### URL State
- **Required**: Use URL query parameters for pagination state (`?page=2`)
- **Required**: Use `useSearchParams` from `next/navigation` to read page from URL
- **Required**: Use `router.push()` to update URL when page changes
- **Pattern**: `router.push(`/endpoint?page=${newPage}`)`
- **Exception - Local State Allowed**: Local state pagination is acceptable when:
  - Filters only affect the paginated table/data (not other page sections like stats, timeline, etc.)
  - Bookmarking/sharing filtered views is not a priority
  - The page contains multiple independent sections where filters don't apply globally
  - **Pattern**: Use `useState` for page state and call `setCurrentPage(newPage)` directly
  - **Example**: Dashboard pages with stats/timeline sections where filters only affect the checks table

### Page Size
- **Required**: Use fixed page size of 20 items per page
- **Forbidden**: Do not use variable or user-configurable page sizes
- **Pattern**: `limit=20` in API calls

## API Pattern

### Query Parameters
- **Required**: Accept `page` query parameter (defaults to 1)
- **Required**: Accept `limit` query parameter (defaults to 20, max 100)
- **Pattern**: 
  ```typescript
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)));
  const offset = (page - 1) * limit;
  ```

### SQL Query
- **Required**: Use `COUNT(*) OVER()` for total count in a single query
- **Required**: Use `LIMIT` and `OFFSET` for pagination
- **Pattern**:
  ```sql
  SELECT 
    -- columns
    COUNT(*) OVER() as total_count
  FROM table
  WHERE conditions
  ORDER BY column DESC
  LIMIT $limit OFFSET $offset
  ```

### Response Format
- **Required**: Return pagination metadata object
- **Required**: Include `page`, `limit`, `total`, `totalPages` in response
- **Pattern**:
  ```typescript
  return NextResponse.json({
    items: result.rows.map(...),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
  ```

## Reference Implementation Summary

**UI (app/threadlines/page.tsx):**
- Read page from URL: `const currentPage = parseInt(searchParams.get('page') || '1', 10)`
- Fetch data: `fetch(\`/api/threadlines?page=${currentPage}&limit=20\`)`
- Handle page change: `router.push(\`/threadlines?page=${newPage}\`)`
- Render: `<Pagination page={pagination.page} totalPages={pagination.totalPages} total={pagination.total} limit={pagination.limit} itemName="threadline" onPageChange={handlePageChange} />`

**API (app/api/threadlines/route.ts):**
- Parse params: `const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))` and `const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10)))`
- Calculate offset: `const offset = (page - 1) * limit`
- Get total: `SELECT COUNT(*) as total FROM table WHERE account_id = $1`
- Query with pagination: `SELECT ... LIMIT $2 OFFSET $3`
- Return: `{ items: [...], pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }`

**Component (app/components/pagination.tsx):**
- Props: `page`, `totalPages`, `total`, `limit`, `itemName`, `onPageChange`
- Displays "Showing X-Y of Z items" text
- Previous/Next buttons with disabled states
- Page number buttons (current page highlighted in green) with ellipsis for large page counts

## Reasoning
Consistent pagination patterns ensure users have a predictable experience across all paginated pages. Using a shared component reduces code duplication and makes it easier to maintain and update pagination behavior. URL-based state allows users to bookmark specific pages and share links.

**Exception Rationale**: On pages with multiple independent sections (e.g., dashboard with stats, timeline, and filtered table), local state pagination is acceptable when filters only affect the paginated table. This simplifies state management and avoids unnecessary URL complexity when bookmarking filtered views isn't needed. The default pattern (URL-based) should still be used unless these specific conditions are met.

