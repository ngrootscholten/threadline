/**
 * GitLab API Service
 * Handles all interactions with GitLab API
 */

const GITLAB_API_BASE = "https://gitlab.com/api/v4";

export interface PipelineMetrics {
  averageRunTime: number; // in seconds
  successRate: number; // percentage
  totalPipelines: number;
}

/**
 * Extract project path from GitLab URL
 * Example: https://gitlab.com/username/project -> username/project
 */
export function extractProjectPath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathMatch = urlObj.pathname.match(/^\/(.+?)(?:\.git)?$/);
    return pathMatch ? pathMatch[1] : null;
  } catch {
    return null;
  }
}

/**
 * Fetch pipeline metrics for a GitLab project
 * TODO: Implement actual API calls
 */
export async function fetchPipelineMetrics(
  projectPath: string,
  token: string
): Promise<PipelineMetrics> {
  // TODO: Implement GitLab API integration
  // 1. Fetch pipelines: GET /projects/:id/pipelines
  // 2. Calculate average run time
  // 3. Calculate success rate
  
  console.log("Fetching metrics for project:", projectPath);
  console.log("Using token:", token ? "***" : "not set");
  
  // Placeholder return
  return {
    averageRunTime: 0,
    successRate: 0,
    totalPipelines: 0,
  };
}



