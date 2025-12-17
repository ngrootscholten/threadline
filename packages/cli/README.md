# threadlines

Threadline CLI - AI-powered linter based on your natural language documentation.

## Installation

```bash
npm install -g threadlines
```

Or use with npx:

```bash
npx threadlines check
```

## Quick Start

### 1. Initialize Your First Threadline

```bash
npx threadlines init
```

This command:
- Creates a `/threadlines` directory in your project root
- Generates `threadlines/example.md` with a template threadline
- Provides instructions for setting up your API key

### 2. Configure API Key

Create a `.env.local` file in your project root:

```bash
THREADLINE_API_KEY=your-api-key-here
```

**Important:** Make sure `.env.local` is in your `.gitignore` file!

For CI/CD environments, set `THREADLINE_API_KEY` as an environment variable in your platform settings.

### 3. Edit Your Threadline

Edit `threadlines/example.md` with your coding standards, then rename it to something descriptive (e.g., `error-handling.md`).

### 4. Run Checks

```bash
npx threadlines check
```

## Usage

### Initialize Threadline Template

```bash
threadlines init
```

Creates a template threadline file to get you started. The command will:
- Create the `/threadlines` directory if it doesn't exist
- Generate `threadlines/example.md` with boilerplate content
- Display instructions for API key configuration

### Check Code Against Threadlines

```bash
threadlines check
```

Analyzes your git changes against all threadlines in the `/threadlines` directory.

**Options:**
- `--api-url <url>` - Override the server URL (default: http://localhost:3000)

## Configuration

### Environment Variables

- `THREADLINE_API_KEY` - **Required.** Your Threadline API key for authentication
  - Can be set in `.env.local` file (recommended for local development)
  - Or as an environment variable (required for CI/CD)
- `THREADLINE_API_URL` - Server URL (default: http://localhost:3000)
  - Can also be set with `--api-url` flag: `npx threadlines check --api-url http://your-server.com`

## Threadline Files

Create a `/threadlines` folder in your repository. Each markdown file is a threadline defining a code quality standard.

### Format

Each threadline file must have YAML frontmatter and a markdown body:

```markdown
---
id: unique-id
version: 1.0.0
patterns:
  - "**/api/**"
  - "**/*.ts"
context_files:
  - "path/to/context-file.ts"
---

# Your Threadline Title

Your guidelines and standards here...
```

### Required Fields

- **`id`**: Unique identifier (e.g., `sql-queries`, `error-handling`)
- **`version`**: Semantic version (e.g., `1.0.0`)
- **`patterns`**: Array of glob patterns matching files to check (e.g., `["**/api/**", "**/*.ts"]`)
- **Body**: Markdown content describing your standards

### Optional Fields

- **`context_files`**: Array of file paths that provide context (always included, even if unchanged)

### Example: SQL Queries with Schema Context

```markdown
---
id: sql-queries
version: 1.0.0
patterns:
  - "**/queries/**"
  - "**/*.sql"
context_files:
  - "schema.sql"
---

# SQL Query Standards

All SQL queries must:
- Reference tables and columns that exist in schema.sql
- Use parameterized queries (no string concatenation)
- Include proper indexes for WHERE clauses
```

The `schema.sql` file will always be included as context, even if you're only changing query files.

