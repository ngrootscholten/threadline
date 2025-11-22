/**
 * Domain Models for DevThreadline
 * 
 * Contains all domain classes and types for pipeline/workflow analysis.
 * These models represent our simplified, normalized view of CI/CD data
 * that will eventually be stored in the database.
 */

// ============================================================================
// Workflow Run Types and Models
// ============================================================================

/**
 * Defines the possible final results (conclusions) of a completed workflow run.
 * These are the primary metrics for analyzing pipeline stability/flakiness.
 */
export type WorkflowConclusion = 
  | 'success' 
  | 'failure' 
  | 'cancelled' 
  | 'neutral' 
  | 'timed_out' 
  | 'action_required' 
  | 'skipped' 
  | 'stale';

/**
 * Defines the possible statuses of a workflow run, whether complete or in-progress.
 */
export type WorkflowStatus = 
  | 'completed' 
  | 'in_progress' 
  | 'queued' 
  | 'requested' 
  | 'waiting' 
  | 'pending'
  | 'delayed'; // 'delayed' added as it can occur before 'in_progress'

/**
 * Core Metrics Interface for a Single Workflow Run
 * 
 * Contains only the essential fields needed for duration and outcome metrics.
 * This will eventually become a database model/table.
 */
export interface WorkflowRunMetric {
  id: number;                      // Unique run ID for tracking and lookup
  name: string;                    // Display name of the workflow (e.g., 'E2E Tests')
  run_number: number;              // Sequential run number of the workflow
  head_branch: string;             // Git branch the workflow ran on (e.g., 'dev', 'main')
  status: WorkflowStatus;          // Overall status of the run (strongly typed)
  conclusion: WorkflowConclusion | null; // Final result of the run (null if still in progress)
  run_started_at: string;          // ISO 8601 Timestamp when execution started
  updated_at: string;              // ISO 8601 Timestamp when status last changed
}

// ============================================================================
// Future: Add more domain models here as needed
// Examples:
// - WorkflowDefinition (metadata about the workflow itself)
// - RepositoryMetrics (aggregate stats per repo)
// - etc.
// ============================================================================



