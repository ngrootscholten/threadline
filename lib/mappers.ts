/**
 * Mappers for transforming external API data into domain models
 * 
 * This layer transforms raw API responses (GitHub, GitLab, etc.)
 * into our normalized domain models defined in types/domain.ts
 */

import { WorkflowRunMetric, WorkflowStatus, WorkflowConclusion } from '@/types/domain';

// ============================================================================
// GitHub API Types (minimal, only what we need for mapping)
// ============================================================================

interface GitHubWorkflowRun {
  id: number;
  name: string | null;
  run_number: number;
  head_branch: string | null;
  status: string | null;
  conclusion: string | null;
  run_started_at: string | null;
  updated_at: string;
}

interface GitHubWorkflowRunsResponse {
  total_count: number;
  workflow_runs: GitHubWorkflowRun[];
}

// ============================================================================
// GitHub Mappers
// ============================================================================

/**
 * Maps a single GitHub workflow run to our domain model
 * Handles null/missing data with sensible defaults
 */
export function mapGitHubRunToDomain(run: GitHubWorkflowRun): WorkflowRunMetric | null {
  // Filter out runs with missing critical data
  if (!run.id || !run.run_number) {
    return null;
  }

  // Map status with fallback
  const status = (run.status || 'unknown') as WorkflowStatus;
  
  // Map conclusion (can be null for in-progress runs)
  let conclusion: WorkflowConclusion | null = null;
  if (run.conclusion) {
    conclusion = run.conclusion as WorkflowConclusion;
  }

  return {
    id: run.id,
    name: run.name || 'Unnamed Workflow',
    run_number: run.run_number,
    head_branch: run.head_branch || 'unknown',
    status,
    conclusion,
    run_started_at: run.run_started_at || run.updated_at,
    updated_at: run.updated_at,
  };
}

/**
 * Maps GitHub workflow runs response to array of domain models
 * Filters out any runs that couldn't be mapped
 */
export function mapGitHubRunsToDomain(response: GitHubWorkflowRunsResponse): WorkflowRunMetric[] {
  return response.workflow_runs
    .map(mapGitHubRunToDomain)
    .filter((run): run is WorkflowRunMetric => run !== null);
}

// ============================================================================
// Future: Add mappers for GitLab, other providers, etc.
// ============================================================================



