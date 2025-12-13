# Threadline File Format

Threadline files are structured markdown files with YAML frontmatter and a markdown body.

## Format

```markdown
---
id: feature-flags
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/routes/**"
context_files:
  - "lib/FeatureFlagService.ts"
  - "types/feature-flags.ts"
---

# Feature Flag Standards

All feature flags must:
- Use our FeatureFlagService (not direct SDK calls)
- Include fallback behavior for when flags are unavailable
- Log flag evaluations to our analytics service
```

## Fields

### `id` (required)
- Unique identifier for the threadline
- Used for tracking and logging
- Must be valid identifier (alphanumeric, hyphens, underscores)
- Example: `feature-flags`, `error-handling`, `api-design`

### `version` (required)
- Semantic version number
- Used for tracking threadline changes over time
- Format: `MAJOR.MINOR.PATCH`
- Example: `1.0.0`, `2.1.3`

### `patterns` (required)
- Array of glob patterns matching file paths
- Determines which files this threadline should check
- Uses standard glob syntax (`**` for recursive, `*` for single level)
- Example: `["**/api/**", "**/*.tsx"]`
- If file matches pattern, threadline will check it

### `context_files` (optional)
- Array of file paths relative to repo root
- These files will be read and sent as context to the LLM
- Useful for providing examples, type definitions, or related code
- Example: `["lib/FeatureFlagService.ts", "types/feature-flags.ts"]`
- Files are read and included in the prompt

### Body (required)
- Markdown content describing the expert's guidelines
- This is what the LLM uses to understand what the threadline checks
- Can include examples, rules, patterns, etc.
- Should be clear and specific

## Validation Rules

1. Must have valid YAML frontmatter
2. All required fields must be present
3. `id` must be unique within a repository (each threadline needs a unique ID)
4. `version` must be valid semver
5. `patterns` must be non-empty array
6. `context_files` must exist if specified
7. Body must have content

## Example Threadline Files

### Example 1: Feature Flags
```markdown
---
id: feature-flags
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/components/**"
context_files:
  - "lib/FeatureFlagService.ts"
---

# Feature Flag Standards

All feature flags must use our FeatureFlagService wrapper.
```

### Example 2: Error Handling
```markdown
---
id: error-handling
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/routes/**"
context_files:
  - "lib/errors.ts"
  - "types/api.ts"
---

# Error Handling Standards

All API routes must return errors in our ErrorResponse format.
```

