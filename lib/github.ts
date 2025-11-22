/**
 * GitHub API Service
 * Handles all interactions with GitHub API
 */

const GITHUB_API_BASE = "https://api.github.com";

/**
 * Extract owner and repo from GitHub URL
 * Example: https://github.com/facebook/react -> { owner: "facebook", repo: "react" }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const urlObj = new URL(url);
    
    // Check if it's a github.com URL
    if (!urlObj.hostname.includes('github.com')) {
      return null;
    }
    
    // Extract owner/repo from pathname
    const pathMatch = urlObj.pathname.match(/^\/([^\/]+)\/([^\/]+?)(?:\.git)?$/);
    
    if (pathMatch) {
      return {
        owner: pathMatch[1],
        repo: pathMatch[2],
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch workflow runs for a GitHub repository
 * Returns raw GitHub API response
 */
export async function fetchWorkflowRuns(
  owner: string,
  repo: string,
  token: string
): Promise<any> {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/actions/runs`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GitHub API error (${response.status}): ${errorBody}`);
  }
  
  return response.json();
}



