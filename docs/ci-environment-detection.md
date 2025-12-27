# CI Environment Detection

## Overview

Threadlines CLI detects the CI environment and uses environment-specific variables to determine repository name, branch name, and review context.

## Environments Detected

- **Vercel**: `VERCEL=1`
- **GitHub Actions**: `GITHUB_ACTIONS=1`
- **GitLab CI**: `GITLAB_CI=1` or `CI=1` + `CI_COMMIT_SHA`
- **Local**: None of the above

## Environment Variables by Platform

### Vercel
- `VERCEL=1` - Always set in Vercel builds
- `VERCEL_GIT_REPO_OWNER` - Repository owner (e.g., "ngrootscholten")
- `VERCEL_GIT_REPO_SLUG` - Repository name (e.g., "threadline")
- `VERCEL_GIT_REPO_ID` - Repository ID
- `VERCEL_GIT_COMMIT_REF` - Branch name (e.g., "main")
- `VERCEL_GIT_COMMIT_SHA` - Commit SHA

### GitHub Actions
- `GITHUB_ACTIONS=1` - Always set
- `GITHUB_REF_NAME` - Branch name
- `GITHUB_SHA` - Commit SHA
- `GITHUB_EVENT_NAME` - Event type (e.g., "pull_request")
- `GITHUB_BASE_REF` - Target branch (PRs)
- `GITHUB_HEAD_REF` - Source branch (PRs)

### GitLab CI
- `GITLAB_CI=1` - Always set
- `CI_COMMIT_REF_NAME` - Branch name
- `CI_COMMIT_SHA` - Commit SHA
- `CI_MERGE_REQUEST_IID` - MR number
- `CI_MERGE_REQUEST_TARGET_BRANCH_NAME` - Target branch
- `CI_MERGE_REQUEST_SOURCE_BRANCH_NAME` - Source branch
- `CI_MERGE_REQUEST_TITLE` - MR title

## Current Issues

### Vercel
- ❌ Git remotes not available (0 remotes found)
- ❌ Git branch detection returns "master" instead of "main"
- ✅ Environment detection works correctly
- ✅ Vercel env vars are available and correct

### Strategy
- **Repository name**: Construct from `VERCEL_GIT_REPO_OWNER` + `VERCEL_GIT_REPO_SLUG`
- **Branch name**: Use `VERCEL_GIT_COMMIT_REF` directly (don't rely on git command)
- **Fallback**: Use git commands only for local development

