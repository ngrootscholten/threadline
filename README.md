# DevThreadline

A Next.js application for monitoring GitHub (and eventually GitLab) workflow metrics.

## Features

- 📊 Workflow run time tracking
- ✅ Workflow success rate monitoring
- 🔐 Secure backend API (token never exposed to browser)
- 📝 Raw GitHub API response viewer

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A GitHub account with a Personal Access Token

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file:

```bash
GITHUB_ACCESS_TOKEN=your_github_token_here
```

3. Generate your GitHub Personal Access Token:
   - Go to https://github.com/settings/tokens
   - Click "Generate new token" (classic)
   - Required scopes: `repo` (for private repos) or `public_repo` (for public repos only)
   - Copy the token and add it to `.env.local`

4. Run the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Enter a GitHub repository URL (e.g., `https://github.com/facebook/react`)
2. Click "Fetch Workflow Runs" to load data from GitHub
3. View the raw GitHub API response in the textarea

## Security

- ✅ **Backend-only API calls**: Your GitHub token is only used server-side (Next.js API routes)
- ✅ **Token never exposed**: The browser never sees your Personal Access Token
- ✅ **Environment variables**: Token stored securely in `.env.local`

## Architecture

The application follows a clean layered architecture:

### 📁 Project Structure
```
types/
  domain.ts          # Domain models (WorkflowRunMetric, etc.)
                     # Single source of truth for all domain types

lib/
  github.ts          # GitHub API client (raw data fetching)
  mappers.ts         # Transform external APIs → domain models

app/
  api/
    github/
      workflow-runs/ # Backend API route (secure, uses mappers)
  page.tsx           # Frontend (displays mapped domain data)
```

### 🔄 Data Flow
1. **Frontend** → POST to `/api/github/workflow-runs` with repo URL
2. **API Route** → Fetches raw data from GitHub API (token server-side only)
3. **Mapper** → Transforms raw GitHub data → `WorkflowRunMetric[]` domain models
4. **API Route** → Returns clean, typed domain models to frontend
5. **Frontend** → Displays mapped data

This pattern makes it easy to:
- Add database persistence later (swap data source in API route)
- Support multiple providers (add GitLab mapper)
- Test transformations independently
- Keep all domain models in one place (`types/domain.ts`)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **API**: GitHub REST API

## Roadmap

- [x] Implement GitHub API integration with secure backend
- [x] Create domain models and mapper pattern
- [x] Transform GitHub API data to WorkflowRunMetric domain models
- [ ] Calculate and display average workflow run time
- [ ] Calculate and display workflow success rate
- [ ] Add data visualization (charts/graphs)
- [ ] Support multiple repositories
- [ ] Add GitLab support
- [ ] Database integration for historical data
- [ ] User authentication and saved preferences

## License

MIT

