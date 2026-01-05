"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Metric {
  id: string;
  check_id: string;
  check_threadline_id: string | null;
  metric_type: 'llm_call' | 'check_summary';
  metrics: any;
  recorded_at: string;
  created_at: string;
  environment: string | null;
}

interface CheckData {
  checkId: string;
  summary: Metric | null;
  llmCalls: Metric[];
  checkStartTime: number;
  checkEndTime: number;
  totalTime: number;
  environment: string | null;
}

export default function MetricsPage() {
  const { data: session, status } = useSession();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchMetrics();
    }
  }, [status]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/metrics', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  // Group metrics by check_id
  const checksData = useMemo(() => {
    const checksMap = new Map<string, CheckData>();

    metrics.forEach(metric => {
      if (!checksMap.has(metric.check_id)) {
        checksMap.set(metric.check_id, {
          checkId: metric.check_id,
          summary: null,
          llmCalls: [],
          checkStartTime: 0,
          checkEndTime: 0,
          totalTime: 0,
          environment: metric.environment || null,
        });
      }

      const checkData = checksMap.get(metric.check_id)!;

      if (metric.metric_type === 'check_summary') {
        checkData.summary = metric;
        const timing = metric.metrics?.timing;
        if (timing?.started_at && timing?.finished_at) {
          checkData.checkStartTime = new Date(timing.started_at).getTime();
          checkData.checkEndTime = new Date(timing.finished_at).getTime();
          checkData.totalTime = timing.total_response_time_ms || 0;
        }
      } else if (metric.metric_type === 'llm_call') {
        checkData.llmCalls.push(metric);
      }
    });

    // Sort LLM calls by start time within each check
    checksMap.forEach(checkData => {
      checkData.llmCalls.sort((a, b) => {
        const aStart = new Date(a.metrics?.timing?.started_at || 0).getTime();
        const bStart = new Date(b.metrics?.timing?.started_at || 0).getTime();
        return aStart - bStart;
      });
    });

    return Array.from(checksMap.values()).sort((a, b) => {
      return (b.checkStartTime || 0) - (a.checkStartTime || 0);
    });
  }, [metrics]);

  // Prepare token trend data
  const tokenTrendData = useMemo(() => {
    return checksData
      .filter(check => check.summary) // Only checks with summaries
      .map(check => {
        const summary = check.summary!;
        const recordedAt = new Date(summary.recorded_at);
        
        // Sum up prompt tokens from all LLM calls in this check
        const totalPromptTokens = check.llmCalls.reduce((sum, call) => {
          return sum + (call.metrics?.tokens?.prompt_tokens || 0);
        }, 0);

        const totalTokens = check.llmCalls.reduce((sum, call) => {
          return sum + (call.metrics?.tokens?.total_tokens || 0);
        }, 0);

        const totalCompletionTokens = check.llmCalls.reduce((sum, call) => {
          return sum + (call.metrics?.tokens?.completion_tokens || 0);
        }, 0);

        return {
          date: recordedAt.toLocaleString(),
          timestamp: recordedAt.getTime(),
          promptTokens: totalPromptTokens,
          totalTokens: totalTokens,
          completionTokens: totalCompletionTokens,
          checkId: check.checkId.substring(0, 8),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest to newest for graph (left to right)
  }, [checksData]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const validChecks = checksData.filter(c => c.summary);
    const allPromptTokens = tokenTrendData.map(d => d.promptTokens);
    const allTotalTokens = tokenTrendData.map(d => d.totalTokens);
    const allTotalTimes = validChecks.map(c => c.totalTime);

    return {
      totalChecks: validChecks.length,
      avgPromptTokens: allPromptTokens.length > 0
        ? Math.round(allPromptTokens.reduce((a, b) => a + b, 0) / allPromptTokens.length)
        : 0,
      maxPromptTokens: allPromptTokens.length > 0 ? Math.max(...allPromptTokens) : 0,
      totalTokens: allTotalTokens.length > 0
        ? allTotalTokens.reduce((a, b) => a + b, 0)
        : 0,
      avgResponseTime: allTotalTimes.length > 0
        ? Math.round(allTotalTimes.reduce((a, b) => a + b, 0) / allTotalTimes.length)
        : 0,
      dateRange: validChecks.length > 0
        ? {
            start: new Date(validChecks[0].checkStartTime).toLocaleDateString(),
            end: new Date(validChecks[validChecks.length - 1].checkStartTime).toLocaleDateString(),
          }
        : null,
    };
  }, [checksData, tokenTrendData]);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-slate-400">Loading metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Metrics Dashboard</h1>
          <p className="text-slate-400">Performance metrics and trends</p>
        </div>

        {/* Summary Stats */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div>
              <p className="text-sm text-slate-400">Total Checks</p>
              <p className="text-2xl font-bold text-white">{stats.totalChecks}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Tokens</p>
              <p className="text-2xl font-bold text-white">{stats.totalTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Prompt Tokens</p>
              <p className="text-2xl font-bold text-white">{stats.avgPromptTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Max Prompt Tokens</p>
              <p className="text-2xl font-bold text-yellow-400">{stats.maxPromptTokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Avg Response Time</p>
              <p className="text-2xl font-bold text-white">{stats.avgResponseTime}ms</p>
            </div>
            {stats.dateRange && (
              <div>
                <p className="text-sm text-slate-400">Date Range</p>
                <p className="text-lg font-semibold text-white">{stats.dateRange.start}</p>
                <p className="text-lg font-semibold text-white">to {stats.dateRange.end}</p>
              </div>
            )}
          </div>
        </div>

        {/* Token Trend Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Token use per check (time scale not even)</h2>
          {tokenTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={tokenTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '4px' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="promptTokens" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Prompt Tokens"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="totalTokens" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Total Tokens"
                  dot={{ r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completionTokens" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Completion Tokens"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-400 text-center py-8">No data available</p>
          )}
        </div>

        {/* Waterfall Charts */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Check Waterfalls</h2>
          <div className="space-y-6">
            {(() => {
              // Filter checks with summaries and LLM calls
              const validChecks = checksData.filter(c => c.summary && c.llmCalls.length > 0);
              
              // Calculate maxTime for each check
              const checksWithMaxTime = validChecks.map(check => {
                const checkStart = check.checkStartTime;
                const maxTime = Math.max(
                  ...check.llmCalls.map(c => {
                    const end = new Date(c.metrics?.timing?.finished_at || 0).getTime();
                    return end - checkStart;
                  }),
                  check.totalTime
                );
                return { ...check, maxTime };
              });
              
              // Calculate 75th percentile for scaling (to avoid outlier domination)
              const sortedMaxTimes = checksWithMaxTime.map(c => c.maxTime).sort((a, b) => a - b);
              const percentile75Index = Math.floor(sortedMaxTimes.length * 0.75);
              const percentile75MaxTime = sortedMaxTimes[percentile75Index] || sortedMaxTimes[sortedMaxTimes.length - 1] || 1;
              
              return checksWithMaxTime.map((check) => {
                const summary = check.summary!;
                const checkStart = check.checkStartTime;
                
                // Determine if this check is an outlier (exceeds 75th percentile)
                const isOutlier = check.maxTime > percentile75MaxTime;
                
                // Use 75th percentile scale for normal checks, own scale for outliers
                const maxTime = isOutlier ? check.maxTime : percentile75MaxTime;

              // Calculate total tokens for this check
              const totalTokens = check.llmCalls.reduce((sum, call) => {
                return sum + (call.metrics?.tokens?.total_tokens || 0);
              }, 0);

              // Get model name from first LLM call (all should be the same)
              const modelName = check.llmCalls[0]?.metrics?.model || 'unknown';

              // Format date/time like dashboard/threadlines pages
              const formatDate = (dateString: string) => {
                const date = new Date(dateString);
                return date.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              };

              // Format time as hh:mm:ss:mmm for tooltips (local timezone)
              const formatTime = (timestamp: number | string | null | undefined): string => {
                if (!timestamp) return 'N/A';
                const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
                if (isNaN(date.getTime())) return 'N/A';
                const hours = date.getHours().toString().padStart(2, '0');
                const minutes = date.getMinutes().toString().padStart(2, '0');
                const seconds = date.getSeconds().toString().padStart(2, '0');
                const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
                return `${hours}:${minutes}:${seconds}:${milliseconds}`;
              };

              // Use percentage-based scaling instead of ch units
              // Scale to use ~102% of available width (maximize usage, slight overflow acceptable)
              const maxBarWidthPercent = 102;

              // Environment badge styling
              const getEnvironmentBadgeStyle = (env: string | null) => {
                if (!env) return 'bg-slate-600 text-slate-200';
                const envLower = env.toLowerCase();
                if (envLower === 'github' || envLower === 'gitlab') return 'bg-blue-600 text-white';
                if (envLower === 'vercel') return 'bg-purple-600 text-white';
                if (envLower === 'local') return 'bg-orange-600 text-white';
                return 'bg-slate-600 text-slate-200';
              };

              return (
                <div key={check.checkId} className="border border-slate-700 rounded p-4 bg-slate-800/50">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-mono text-slate-300">Check: {check.checkId.substring(0, 8)}</span>
                    {check.environment && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${getEnvironmentBadgeStyle(check.environment)}`}>
                        {check.environment.toUpperCase()}
                      </span>
                    )}
                    <span className="text-sm text-slate-400">
                      Total: {check.totalTime}ms | LLM Calls: {check.llmCalls.length} | Tokens: {totalTokens.toLocaleString()}
                    </span>
                    <span className="text-sm text-slate-400">
                      Model: {modelName}
                    </span>
                    <span className="text-sm text-slate-400">
                      {formatDate(summary.recorded_at)}
                    </span>
                  </div>
                  
                  <div className="w-full">
                    {check.llmCalls.map((call, idx) => {
                      const callStart = new Date(call.metrics?.timing?.started_at || 0).getTime();
                      const callEnd = new Date(call.metrics?.timing?.finished_at || 0).getTime();
                      const startOffsetMs = callStart - checkStart;
                      const durationMs = callEnd - callStart;
                      const threadlineId = call.metrics?.threadline_id || 'unknown';
                      const tokens = call.metrics?.tokens?.prompt_tokens || 0;
                      const responseTime = call.metrics?.timing?.response_time_ms || 0;

                      // Calculate gap before this call
                      // For parallel calls, show gap from check start
                      // For sequential calls, show gap from previous call end
                      const previousCallEnd = idx > 0 
                        ? new Date(check.llmCalls[idx - 1].metrics?.timing?.finished_at || 0).getTime()
                        : checkStart;
                      
                      // If this call starts before the previous one ended, they're parallel
                      // Show gap from check start instead
                      const isParallel = idx > 0 && callStart < previousCallEnd;
                      const gapBeforeMs = isParallel 
                        ? callStart - checkStart  // Gap from check start for parallel calls
                        : callStart - previousCallEnd; // Gap from previous call end for sequential calls

                      // Calculate gap after this call (until next call starts or check ends)
                      const isLastCall = idx === check.llmCalls.length - 1;
                      const nextCallStart = !isLastCall
                        ? new Date(check.llmCalls[idx + 1].metrics?.timing?.started_at || 0).getTime()
                        : check.checkStartTime + check.totalTime;
                      const gapAfterMs = nextCallStart - callEnd;
                      
                      // Calculate time from this call finishing until check completes
                      const timeUntilCheckCompleteMs = (check.checkStartTime + check.totalTime) - callEnd;

                      // Calculate percentages based on maxTime
                      const startOffsetPercent = maxTime > 0 ? (startOffsetMs / maxTime) * maxBarWidthPercent : 0;
                      const durationPercent = maxTime > 0 ? (durationMs / maxTime) * maxBarWidthPercent : 0;
                      const gapBeforePercent = maxTime > 0 ? (gapBeforeMs / maxTime) * maxBarWidthPercent : 0;
                      const gapAfterPercent = maxTime > 0 ? (gapAfterMs / maxTime) * maxBarWidthPercent : 0;

                      return (
                        <div key={call.id} className="mb-1 flex items-center text-xs font-mono w-full">
                          <div className="w-48 flex-shrink-0 text-slate-300 truncate" title={threadlineId}>
                            {threadlineId}
                          </div>
                          <div className="flex-1 flex items-center h-6 min-w-0 relative">
                            {/* Gap before this call */}
                            {gapBeforePercent > 0 && (
                              <div 
                                style={{ width: `${gapBeforePercent}%` }}
                                className="h-full flex items-center justify-center text-slate-500 text-[10px] font-mono"
                                title={`Gap: ${gapBeforeMs}ms
${formatTime(checkStart)}  checkStart
${formatTime(callStart)}  callStart
Raw: checkStart=${checkStart}, callStart=${callStart}`}
                              >
                                {gapBeforePercent > 2 && gapBeforeMs > 0 ? `${gapBeforeMs}ms` : ''}
                              </div>
                            )}
                            {/* LLM call bar */}
                            <div 
                              style={{ width: `${Math.max(0.5, durationPercent)}%` }}
                              className="bg-blue-500 text-white text-center h-full flex items-center justify-center min-w-[2px] relative font-mono"
                              title={`LLM Call: ${durationMs}ms
${formatTime(call.metrics?.timing?.started_at)}  metrics.timing.started_at
${formatTime(call.metrics?.timing?.finished_at)}  metrics.timing.finished_at
${String(call.metrics?.timing?.response_time_ms || 'N/A').padStart(12)}  metrics.timing.response_time_ms
${String(call.metrics?.tokens?.prompt_tokens || 'N/A').padStart(12)}  metrics.tokens.prompt_tokens
${String(call.metrics?.tokens?.total_tokens || 'N/A').padStart(12)}  metrics.tokens.total_tokens`}
                            >
                              {durationPercent > 3 ? (
                                <span className="text-[10px] font-semibold whitespace-nowrap">{durationMs}ms</span>
                              ) : durationPercent > 1 ? (
                                <span className="text-[9px] font-semibold">{durationMs}</span>
                              ) : null}
                            </div>
                            {/* Gap after this call - show to the right of the blue bar */}
                            {/* Always show this segment sized by time remaining until check completes */}
                            {/* For parallel calls, gapAfterMs might be small/negative, so we use timeUntilCheckCompleteMs for sizing */}
                            {(() => {
                              const timeRemainingPercent = maxTime > 0 ? (timeUntilCheckCompleteMs / maxTime) * maxBarWidthPercent : 0;
                              const checkEndTime = check.checkStartTime + check.totalTime;
                              return (
                                <div 
                                  style={{ width: `${Math.max(0.5, timeRemainingPercent)}%` }}
                                  className="h-full flex items-center justify-center text-slate-500 text-[10px] min-w-[2px] font-mono"
                                  title={`Time Remaining: ${timeUntilCheckCompleteMs}ms
${formatTime(callEnd)}  callEnd
${formatTime(checkEndTime)}  checkEnd
Raw: callEnd=${callEnd}, checkEnd=${checkEndTime}
${formatTime(call.metrics?.timing?.finished_at)}  metrics.timing.finished_at
${formatTime(summary.metrics?.timing?.finished_at)}  summary.metrics.timing.finished_at`}
                                >
                                  {/* Always show time remaining until check completes for every call */}
                                  {timeUntilCheckCompleteMs > 0 && timeRemainingPercent > 1 && (
                                    <span className="whitespace-nowrap">+{timeUntilCheckCompleteMs}ms</span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          <div className="w-24 flex-shrink-0 text-slate-400 text-right ml-2 whitespace-nowrap">
                            {responseTime}ms
                          </div>
                          <div className="w-20 flex-shrink-0 text-slate-400 text-right ml-2 whitespace-nowrap">
                            {tokens.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Total bar */}
                    <div className="mt-2 pt-2 border-t border-slate-700 flex items-center text-xs font-mono w-full">
                      <div className="w-48 flex-shrink-0 text-slate-300 font-semibold">
                        TOTAL
                        {isOutlier && <span className="ml-2 text-orange-400 text-[10px]">(OUTLIER)</span>}
                      </div>
                      <div className="flex-1 flex items-center h-6 min-w-0 relative">
                        {/* Total bar spans full width from check start to check end */}
                        {/* Use orange for outliers, green for normal checks */}
                        <div 
                          style={{ width: `${maxTime > 0 ? (check.totalTime / maxTime) * maxBarWidthPercent : maxBarWidthPercent}%` }}
                          className={`${isOutlier ? 'bg-orange-500' : 'bg-green-500'} text-white text-center font-semibold h-full flex items-center justify-center min-w-[2px] font-mono`}
                          title={`Total Check: ${check.totalTime}ms
${formatTime(summary.metrics?.timing?.started_at)}  metrics.timing.started_at
${formatTime(summary.metrics?.timing?.finished_at)}  metrics.timing.finished_at
${String(summary.metrics?.timing?.total_response_time_ms || 'N/A').padStart(12)}  metrics.timing.total_response_time_ms
${String(summary.metrics?.parallelization?.total_llm_calls || 'N/A').padStart(12)}  metrics.parallelization.total_llm_calls
${String(summary.metrics?.parallelization?.completed_count || 'N/A').padStart(12)}  metrics.parallelization.completed_count`}
                        >
                          {(() => {
                            const totalBarPercent = maxTime > 0 ? (check.totalTime / maxTime) * maxBarWidthPercent : maxBarWidthPercent;
                            return totalBarPercent > 3 ? (
                              <span className="text-[10px] font-semibold whitespace-nowrap">{check.totalTime}ms</span>
                            ) : (
                              <span className="text-[9px] font-semibold">{check.totalTime}</span>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="w-24 flex-shrink-0 text-slate-300 font-semibold text-right ml-2 whitespace-nowrap">
                        {check.totalTime}ms
                      </div>
                      <div className="w-20 flex-shrink-0 text-slate-300 font-semibold text-right ml-2 whitespace-nowrap">
                        {totalTokens.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              );
              });
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

