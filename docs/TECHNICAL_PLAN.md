# Threadline Technical Implementation Plan

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Developer Machine                        │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Git Repo   │         │  /threadlines│                     │
│  │              │         │   folder     │                     │
│  │  - code/     │         │  - threadline1.md│                  │
│  │  - threadlines│        │  - threadline2.md│                  │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                         │                              │
│         └──────────┬──────────────┘                              │
│                    │                                              │
│                    ▼                                              │
│         ┌──────────────────────┐                                 │
│         │  npx threadline CLI  │                                 │
│         │                      │                                 │
│         │  - Validates threadlines │                             │
│         │  - Collects git diffs│                                 │
│         │  - Calls review API  │                                 │
│         └──────────┬───────────┘                                 │
│                    │                                              │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     │ HTTP POST /api/threadline-check
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Threadline Review Server                      │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              API Endpoint (/api/threadline-check)         │  │
│  │  - Receives: threadlines[], diffs[], files[]             │  │
│  │  - Validates request                                      │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Parallel Threadline Processor                    │  │
│  │                                                           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐              │  │
│  │  │Threadline│  │Threadline│  │Threadline│  ...         │  │
│  │  │    1     │  │    2     │  │    N     │              │  │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘              │  │
│  │       │              │              │                     │  │
│  └───────┼──────────────┼──────────────┼─────────────────────┘  │
│          │              │              │                        │
│          ▼              ▼              ▼                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              LLM API (OpenAI/Anthropic/etc)              │  │
│  │  - LLM model (configurable)                              │  │
│  │  - User's API key (BYO)                                   │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Response Aggregator                              │  │
│  │  - Filters "not_relevant"                                │  │
│  │  - Returns only "attention" + "compliant"              │  │
│  └──────────────────┬───────────────────────────────────────┘  │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Audit Logger (optional)                         │  │
│  │  - Logs: repo, threadlines checked, timestamps          │  │
│  │  - Does NOT log: code content, API responses            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
threadline/
├── packages/
│   ├── cli/                    # npm package: @threadline/cli
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   └── check.ts   # Main check command
│   │   │   ├── validators/
│   │   │   │   └── experts.ts # Validates threadline markdown files
│   │   │   ├── git/
│   │   │   │   └── diff.ts    # Collects git diffs
│   │   │   └── api/
│   │   │       └── client.ts  # HTTP client for review API
│   │   ├── bin/
│   │   │   └── threadline     # CLI entry point
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── server/                 # Review server (self-hosted)
│       ├── src/
│       │   ├── api/
│       │   │   └── routes/
│       │   │       └── threadline-check.ts    # POST /api/threadline-check
│       │   ├── processors/
│       │   │   └── expert.ts       # Parallel threadline processing
│       │   ├── llm/
│       │   │   └── client.ts        # LLM API wrapper
│       │   ├── audit/
│       │   │   └── logger.ts       # Audit logging
│       │   └── server.ts           # Express/Fastify server
│       ├── Dockerfile
│       ├── docker-compose.yml
│       ├── package.json
│       └── README.md
│
├── docs/
│   ├── VISION.md
│   ├── HOW_IT_WORKS.md
│   └── TECHNICAL_PLAN.md
│
├── examples/
│   └── sample-repo/
│       └── threadlines/
│           ├── error-handling.md
│           └── api-design.md
│
└── package.json                 # Monorepo root (optional)
```

## Component Breakdown

### 1. CLI Package (`@threadline/cli`)

**Purpose**: npm-installable CLI tool that developers run locally

**Key Responsibilities**:
- Validate expert markdown files
- Collect git diffs for changed files
- Call review API endpoint
- Display results in readable format

**Implementation Details**:

```typescript
// src/commands/check.ts
export async function checkCommand(options: CheckOptions) {
  // 1. Find and validate threadlines
  const threadlines = await findThreadlines('./threadlines');
  
  // 2. Get git diff
  const diff = await getGitDiff();
  const changedFiles = await getChangedFiles();
  
  // 3. Call review API
  const results = await reviewAPI.post('/api/threadline-check', {
    threadlines: threadlines.map(t => ({ name: t.name, content: t.content })),
    diff: diff,
    files: changedFiles,
    apiKey: process.env.OPENAI_API_KEY // User's key
  });
  
  // 4. Display results
  displayResults(results);
}
```

**Dependencies**:
- `commander` - CLI framework
- `simple-git` - Git operations
- `axios` - HTTP client
- `chalk` - Terminal colors

**Configuration**:
- `.threadlinerc` or `threadline.config.js` (optional)
  - Review server URL (default: localhost:3000 or cloud)
  - API key location

### 2. Review Server

**Purpose**: Self-hosted service that processes expert reviews

**Key Responsibilities**:
- Receive review requests
- Process experts in parallel
- Call LLM API with user's key
- Aggregate and filter results
- Optional audit logging

**Implementation Details**:

```typescript
// src/api/routes/threadline-check.ts
POST /api/threadline-check
Body: {
  threadlines: Array<{ name: string, content: string }>,
  diff: string,
  files: string[],
  apiKey: string  // User's OpenAI key
}

Response: {
  results: Array<{
    expert: string,
    status: "compliant" | "attention" | "not_relevant",
    reasoning?: string,
    lineReferences?: number[]
  }>
}
```

**Parallel Processing**:

```typescript
// src/processors/expert.ts
export async function processThreadlines(
  threadlines: Threadline[],
  diff: string,
  files: string[],
  apiKey: string
): Promise<ExpertResult[]> {
  const promises = threadlines.map(threadline => 
    processThreadline(threadline, diff, files, apiKey)
  );
  
  return Promise.all(promises);
}

async function processThreadline(
  threadline: Threadline,
  diff: string,
  files: string[],
  apiKey: string
): Promise<ExpertResult> {
  const prompt = buildPrompt(threadline.content, diff, files);
  const response = await callLLM(prompt, apiKey);
  return parseResponse(response);
}
```

**LLM Prompt Structure**:

```
You are a code quality checker focused on: {threadline_name}

Threadline Guidelines:
{threadline_content}

Code Changes:
{diff}

Changed Files:
{files}

Review the code changes against the threadline guidelines above.
Return JSON only:
{
  "status": "compliant" | "attention" | "not_relevant",
  "reasoning": "brief explanation",
  "line_references": [line numbers if attention needed]
}
```

**Dependencies**:
- `express` or `fastify` - Web framework
- `openai` - OpenAI SDK
- `pino` - Logging (optional)

### 3. Deployment Options

#### Option A: Self-Hosted (Docker)

```yaml
# docker-compose.yml
version: '3.8'
services:
  threadline-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      # No API key needed - users provide their own
    volumes:
      - ./logs:/app/logs  # Optional audit logs
```

**Deployment Steps**:
1. `git clone https://github.com/threadline/threadline`
2. `cd threadline/packages/server`
3. `docker-compose up -d`
4. Configure CLI: `export THREADLINE_API_URL=http://localhost:3000`

#### Option B: Local Development

```bash
cd packages/server
npm install
npm run dev
# Runs on http://localhost:3000
```

#### Option C: Cloud (Future)

- Deploy to Vercel/Railway/Render
- Users still provide their own API keys
- We log metadata only (repo name, expert names, timestamps)
- No code content or API responses logged

## Data Flow

```
1. Developer runs: npx threadline check
   │
   ├─> CLI validates /threadlines folder
   │   └─> Checks markdown syntax, required fields
   │
   ├─> CLI collects git diff
   │   └─> git diff HEAD (or staged changes)
   │
   ├─> CLI identifies changed files
   │   └─> git diff --name-only
   │
   └─> CLI POSTs to review server
       │
       ├─> threadlines: [{name, content}]
       ├─> diff: string
       ├─> files: string[]
       └─> apiKey: string (from env)
       
2. Review Server receives request
   │
   ├─> Validates request structure
   │
   ├─> Creates parallel workers (one per threadline)
   │   │
   │   └─> Each worker:
   │       ├─> Builds LLM prompt
   │       ├─> Calls OpenAI API (with user's key)
   │       └─> Parses JSON response
   │
   ├─> Aggregates results
   │   └─> Filters out "not_relevant"
   │
   ├─> Optional: Logs audit metadata
   │   └─> {repo, threadlines_checked, timestamp, line_numbers, user_id, issues}
   │
   └─> Returns filtered results
       
3. CLI receives results
   │
   └─> Displays formatted output
       ├─> ⚠️ Threadline Name: Issues found
       └─> ✅ Threadline Name: Compliant
```

## Security Considerations

### API Key Handling
- **Never log API keys**
- **Never store API keys** (only pass through)
- CLI reads from `process.env.OPENAI_API_KEY` or `.env.local`
- Server receives key in request, uses it, discards it

### Audit Logging (Optional)
**What we log**:
- Repository identifier (hash or name)
- Threadline names checked
- Timestamp
- Status (compliant/attention/not_relevant)
- Line numbers where issues were found
- User identifier (email, username, or anonymous ID)
- Issue descriptions/reasoning (for forensic analysis)

**What we DON'T log** (currently):
- Git diffs (raw code changes)
- Full API responses from LLM
- API keys
- Code content (may be added later for enhanced forensics)

### Self-Hosted Privacy
- Users run server locally or on their infrastructure
- No data leaves their network
- Full control over audit logs

## Implementation Phases

### Phase 1: MVP (Self-Hosted Only)
- [ ] CLI package with basic check command
- [ ] Review server with single expert processing
- [ ] OpenAI integration
- [ ] Basic result display
- [ ] Docker setup

### Phase 2: Parallel Processing
- [ ] Parallel expert workers
- [ ] Error handling and retries
- [ ] Result aggregation and filtering
- [ ] Improved CLI output formatting

### Phase 3: Polish
- [ ] Threadline validation with helpful errors
- [ ] Configuration file support
- [ ] Audit logging (optional)
- [ ] Better error messages
- [ ] Documentation

### Phase 4: Cloud Option (Future)
- [ ] Cloud deployment
- [ ] User authentication (for metadata logging)
- [ ] Rate limiting
- [ ] Status page
- [ ] Analytics dashboard (aggregate only)

## Technology Stack

### CLI
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Framework**: Commander.js
- **Git**: simple-git
- **HTTP**: axios

### Server
- **Language**: TypeScript
- **Runtime**: Node.js 18+
- **Framework**: Express or Fastify
- **LLM**: OpenAI SDK
- **Container**: Docker

### Infrastructure (Future Cloud)
- **Hosting**: Vercel/Railway/Render
- **Database**: PostgreSQL (for audit logs only)
- **Auth**: Simple API keys or OAuth

## Testing Strategy

### Unit Tests
- Threadline validation logic
- Git diff parsing
- LLM response parsing
- Result aggregation

### Integration Tests
- CLI → Server communication
- Server → LLM API communication
- End-to-end: check command → results

### Manual Testing
- Real threadline files
- Real code diffs
- Various LLM responses

## Open Questions

1. **Threadline Markdown Format**: What's the required structure?
   - Title?
   - Description?
   - Rules/guidelines?
   - Examples?

2. **Error Handling**: What happens if LLM API fails?
   - Retry logic?
   - Partial results?
   - Fail fast?

3. **Rate Limiting**: For cloud option, how to handle?
   - Per API key?
   - Per user account?
   - Per IP?

4. **Configuration**: Where should config live?
   - `.threadlinerc`?
   - `package.json`?
   - Environment variables?

5. **Threadline Versioning**: How to handle threadline changes?
   - Git history?
   - Version tags?
   - Change detection?

## Next Steps

1. **Set up monorepo structure** (or separate repos?)
2. **Create CLI skeleton** with basic command
3. **Create server skeleton** with basic endpoint
4. **Implement threadline validation**
5. **Implement git diff collection**
6. **Implement basic LLM integration**
7. **Test end-to-end flow**
8. **Add Docker setup**
9. **Write documentation**

---

**Ready to start building?** Let's begin with Phase 1: MVP!

