import { NextRequest, NextResponse } from 'next/server';
import { parseGitHubUrl, fetchWorkflowRuns } from '@/lib/github';
import { mapGitHubRunsToDomain } from '@/lib/mappers';

export async function POST(request: NextRequest) {
  try {
    const { repoUrl } = await request.json();
    
    // Validate input
    if (!repoUrl) {
      return NextResponse.json(
        { error: 'Repository URL is required' },
        { status: 400 }
      );
    }
    
    // Parse GitHub URL
    const parsed = parseGitHubUrl(repoUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL. Expected format: https://github.com/owner/repo' },
        { status: 400 }
      );
    }
    
    // Get token from environment
    const token = process.env.GITHUB_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: 'GitHub access token not configured. Please set GITHUB_ACCESS_TOKEN in .env.local' },
        { status: 500 }
      );
    }
    
    // Fetch workflow runs from GitHub
    const rawData = await fetchWorkflowRuns(parsed.owner, parsed.repo, token);
    
    // Map to domain models
    const workflowRuns = mapGitHubRunsToDomain(rawData);
    
    // Return typed domain models
    return NextResponse.json({
      total_count: workflowRuns.length,
      workflow_runs: workflowRuns,
    });
    
  } catch (error: any) {
    console.error('Error fetching workflow runs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow runs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

