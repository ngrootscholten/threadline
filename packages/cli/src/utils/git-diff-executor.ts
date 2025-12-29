/**
 * Git Diff Execution
 * 
 * Executes the appropriate git diff function based on environment.
 * Each environment has ONE SINGLE IMPLEMENTATION - no fallbacks, no alternatives.
 */

import { ReviewContext } from './context';
import { Environment } from './environment';
import { getGitDiff, getBranchDiff, getCommitDiff, getPRMRDiff } from '../git/diff';
import { getVercelDiff } from '../git/vercel-diff';

export interface GitDiffResult {
  diff: string;
  changedFiles: string[];
}

/**
 * Executes the appropriate git diff function based on environment.
 * 
 * Each environment has a single, specific implementation:
 * - Vercel: Uses VERCEL_GIT_COMMIT_SHA, gets commit diff via git show
 * - GitHub: Uses branch/PR context with base branch detection
 * - GitLab: Uses branch/MR context with base branch detection
 * - Local: Uses staged/unstaged changes
 * 
 * No fallbacks - if the environment-specific implementation fails, we fail clearly.
 */
export async function getDiffForEnvironment(
  environment: Environment,
  repoRoot: string,
  context?: ReviewContext
): Promise<GitDiffResult> {
  switch (environment) {
    case 'vercel':
      // Vercel: Single implementation using commit SHA
      return await getVercelDiff(repoRoot);
    
    case 'github':
    case 'gitlab':
    case 'local':
      // For other environments, use context-based routing (legacy, will be refactored)
      if (!context) {
        throw new Error(`Context required for ${environment} environment`);
      }
      return await getDiffForContext(context, repoRoot, environment);
    
    default:
      const _exhaustive: never = environment;
      throw new Error(`Unknown environment: ${_exhaustive}`);
  }
}

/**
 * Executes the appropriate git diff function based on context.
 * 
 * This is the legacy context-based routing. New code should use getDiffForEnvironment().
 * This function maps context types to their corresponding git diff functions.
 */
export async function getDiffForContext(
  context: ReviewContext,
  repoRoot: string,
  environment: Environment
): Promise<GitDiffResult> {
  switch (context.type) {
    case 'pr':
      return await getPRMRDiff(repoRoot, context.sourceBranch, context.targetBranch);
    
    case 'mr':
      return await getPRMRDiff(repoRoot, context.sourceBranch, context.targetBranch);
    
    case 'branch':
      return await getBranchDiff(repoRoot, context.branchName);
    
    case 'commit':
      return await getCommitDiff(repoRoot, context.commitSha);
    
    case 'local':
      return await getGitDiff(repoRoot);
    
    default:
      // TypeScript exhaustiveness check - should never reach here
      const _exhaustive: never = context;
      throw new Error(`Unknown context type: ${_exhaustive}`);
  }
}

/**
 * Returns a human-readable description of the context for logging.
 */
export function getContextDescription(context: ReviewContext): string {
  switch (context.type) {
    case 'pr':
      return `PR: ${context.prNumber}`;
    case 'mr':
      return `MR: ${context.mrNumber}`;
    case 'branch':
      return `branch: ${context.branchName}`;
    case 'commit':
      return `commit: ${context.commitSha.substring(0, 7)}`;
    case 'local':
      return 'local changes';
    default:
      const _exhaustive: never = context;
      throw new Error(`Unknown context type: ${_exhaustive}`);
  }
}

