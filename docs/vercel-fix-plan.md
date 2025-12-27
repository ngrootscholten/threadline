# Vercel CI Fix Plan

## Problem Analysis

From Vercel build logs:

### ✅ What Works
- Environment detection: Correctly identifies `VERCEL`
- Vercel env vars are available and correct:
  - `VERCEL_GIT_REPO_OWNER = "ngrootscholten"`
  - `VERCEL_GIT_REPO_SLUG = "threadline"`
  - `VERCEL_GIT_COMMIT_REF = "main"`
  - `VERCEL_GIT_COMMIT_SHA = "6ba9b1f79cc50f162fe0cf7eb0254fc1c6c02df3"`

### ❌ What's Broken
1. **Repository name**: Git remotes are empty (0 remotes found)
   - `getRepoName()` fails because no origin remote exists
   - **Fix**: Construct repo URL from `VERCEL_GIT_REPO_OWNER` + `VERCEL_GIT_REPO_SLUG`

2. **Branch name**: Git command returns "master" instead of "main"
   - `git revparse --abbrev-ref HEAD` returns "master"
   - But `VERCEL_GIT_COMMIT_REF = "main"` is correct
   - **Fix**: Use `VERCEL_GIT_COMMIT_REF` directly in Vercel environment

## Implementation Plan

### Step 1: Update `getRepoName()` in `packages/cli/src/git/repo.ts`
- Check for Vercel env vars first
- If `VERCEL_GIT_REPO_OWNER` and `VERCEL_GIT_REPO_SLUG` exist:
  - Construct: `https://github.com/${OWNER}/${SLUG}.git`
  - Return immediately (skip git command)
- Fallback to git command for local dev

### Step 2: Update `getBranchName()` in `packages/cli/src/git/repo.ts`
- Check for Vercel env var first
- If `VERCEL_GIT_COMMIT_REF` exists:
  - Return it directly (skip git command)
- Fallback to git command for local dev

### Step 3: Update `getAutoReviewTarget()` in `packages/cli/src/utils/ci-detection.ts`
- Already uses `VERCEL_GIT_COMMIT_REF` correctly ✅
- No changes needed

### Step 4: Test Strategy
1. Test locally (should use git commands)
2. Test in Vercel (should use env vars)
3. Verify repo name and branch name are correct in DB

## Priority Order
1. **High**: Fix branch name (use `VERCEL_GIT_COMMIT_REF`)
2. **High**: Fix repo name (construct from Vercel env vars)
3. **Medium**: Add similar logic for GitHub Actions
4. **Medium**: Add similar logic for GitLab CI

## Expected Outcome
- Vercel builds will correctly detect:
  - Repository: `https://github.com/ngrootscholten/threadline.git`
  - Branch: `main` (not `master`)
  - Environment: `vercel`
  - Review context: `branch` (not `local`)

