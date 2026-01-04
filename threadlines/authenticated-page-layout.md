---
id: authenticated-page-layout
version: 1.0.0
patterns:
  - "app/**/*.tsx"
  - "app/**/*.ts"
---

# Authenticated Page Layout Standards

## Description
All authenticated pages in the Threadline application must follow consistent layout and spacing patterns to ensure a cohesive user experience and efficient use of vertical space.

## Patterns to Check

### Section Padding
- **Required**: Use `py-12` (48px) for section padding
- **Forbidden**: Do not use `py-24` (96px) or other larger padding values
- **Pattern**: `<section className="max-w-7xl mx-auto px-6 py-12">` or `<section className="max-w-4xl mx-auto px-6 py-12">`

### Panel Padding
- **Required**: Use `p-4 md:p-6` (16px mobile, 24px desktop) for panel padding
- **Forbidden**: Do not use `p-8 md:p-12` (32px/48px) or other larger padding values
- **Pattern**: `<div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">`

### Title Margin
- **Required**: Use `mb-3` (12px) for margin below h1 titles
- **Forbidden**: Do not use `mb-6` (24px) or other larger margin values
- **Pattern**: `<h1 className="text-4xl font-medium mb-3 text-white">Title</h1>`

## Reference Implementation Summary

**Page Structure:**
```tsx
<main className="min-h-screen">
  <section className="max-w-7xl mx-auto px-6 py-12"> {/* or max-w-4xl for narrower pages */}
    {/* Optional: Back link */}
    <div className="mb-6">
      <Link href="/back" className="text-green-400 hover:text-green-300 transition-colors">
        ← Back to Dashboard
      </Link>
    </div>
    
    {/* Main content panel */}
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
      <h1 className="text-4xl font-medium mb-3 text-white">Page Title</h1>
      {/* Content */}
    </div>
  </section>
</main>
```

**Common Patterns:**
- **Loading state**: Same structure with `<p className="text-slate-400">Loading...</p>`
- **Error messages**: `<div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"><p className="text-red-400">{error}</p></div>`
- **Empty states**: `<div className="text-center py-12"><p className="text-slate-400 text-lg mb-2">No items</p></div>`
- **Section spacing**: Use `space-y-6` for spacing between sections, `mb-8` for major section breaks
- **Container widths**: `max-w-7xl` for wide pages (tables, dashboards), `max-w-4xl` for forms/settings
- **Text colors**: `text-white` for headings, `text-slate-300` for body, `text-slate-400` for secondary, `text-slate-500` for muted
- **Borders**: `border-slate-800` for panels, `border-slate-800/50` for table rows
- **Backgrounds**: `bg-slate-900/50` for panels, `bg-slate-950/50` for nested panels, `bg-slate-800/30` for hover states

## Reasoning
Consistent spacing creates a professional, cohesive user experience. The reduced padding values (halved from previous defaults) maximize vertical screen real estate while maintaining readability and visual hierarchy.

