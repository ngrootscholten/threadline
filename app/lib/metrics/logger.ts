import { getPool } from '../db';

export interface LLMCallMetrics {
  type: 'llm_call';
  threadline_id: string;
  model: string;
  status: 'success' | 'timeout' | 'error';
  error_message?: string | null;
  timing: {
    started_at: string; // ISO 8601
    finished_at: string; // ISO 8601
    response_time_ms: number;
  };
  tokens?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
}

export interface CheckSummaryMetrics {
  type: 'check_summary';
  timing: {
    started_at: string; // ISO 8601
    finished_at: string; // ISO 8601
    total_response_time_ms: number;
  };
  parallelization: {
    total_threadlines: number;
    total_llm_calls: number;
    completed_count: number;
    timeout_count: number;
    error_count: number;
  };
}

/**
 * Log LLM call metrics (non-blocking - errors are logged but don't throw)
 */
export async function logLLMCallMetrics(
  checkId: string,
  accountId: string,
  checkThreadlineId: string | null,
  metrics: LLMCallMetrics
): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO check_metrics (check_id, account_id, check_threadline_id, metric_type, metrics)
       VALUES ($1, $2, $3, 'llm_call', $4)`,
      [
        checkId,
        accountId,
        checkThreadlineId,
        JSON.stringify(metrics)
      ]
    );
  } catch (error) {
    // Non-blocking - log but don't throw
    console.error('Failed to log LLM call metrics:', error);
  }
}

/**
 * Log check summary metrics (non-blocking - errors are logged but don't throw)
 */
export async function logCheckSummaryMetrics(
  checkId: string,
  accountId: string,
  metrics: CheckSummaryMetrics
): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(
      `INSERT INTO check_metrics (check_id, account_id, check_threadline_id, metric_type, metrics)
       VALUES ($1, $2, NULL, 'check_summary', $3)`,
      [
        checkId,
        accountId,
        JSON.stringify(metrics)
      ]
    );
  } catch (error) {
    // Non-blocking - log but don't throw
    console.error('Failed to log check summary metrics:', error);
  }
}

