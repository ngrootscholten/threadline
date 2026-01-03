"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pagination } from "../components/pagination";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Check {
  id: string;
  repoName: string | null;
  branchName: string | null;
  environment: string | null;
  commitSha: string | null;
  commitMessage: string | null;
  commitAuthorName: string | null;
  commitAuthorEmail: string | null;
  reviewContext: string | null;
  diffStats: {
    added: number;
    removed: number;
    total: number;
  };
  filesChangedCount: number;
  threadlinesCount: number;
  results: {
    compliant: number;
    attention: number;
    notRelevant: number;
  };
  createdAt: string;
}

interface CheckSummary {
  compliant: string[];
  attention: string[];
  notRelevant: string[];
  total: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterOptions {
  authors: Array<{ value: string; label: string }>;
  environments: Array<{ value: string; label: string }>;
  repositories: Array<{ value: string; label: string }>;
}

interface DashboardStatistics {
  totalChecks: number;
  totalLinesReviewed: number;
  violationsCaught: number;
  uniqueRepos: number;
  complianceRate: number;
  totalFilesReviewed: number;
  checksThisWeek: number;
  cicdChecks: number;
  localChecks: number;
}

interface TimelineCheck {
  id: string;
  createdAt: string;  // ISO timestamp - client will bin by local timezone
  outcome: string;
  repoName: string | null;
  environment: string | null;
  threadlineIds: string[];  // Human-readable threadline names (not version-specific)
}

type GroupByType = 'outcome' | 'repo' | 'environment' | 'threadline';

function DashboardPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checks, setChecks] = useState<Check[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, CheckSummary>>({});
  const [loadingSummaries, setLoadingSummaries] = useState<Set<string>>(new Set());
  const [summaryErrors, setSummaryErrors] = useState<Set<string>>(new Set());
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [authorDropdownOpen, setAuthorDropdownOpen] = useState(false);
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timelineChecks, setTimelineChecks] = useState<TimelineCheck[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupByType>('outcome');

  // Get current page and filters from URL, default to 1
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const authorFilter = searchParams.get('author') || '';
  const environmentFilter = searchParams.get('environment') || '';
  const repoFilter = searchParams.get('repo') || '';

  // Get selected author for display
  const selectedAuthor = authorFilter
    ? filterOptions?.authors.find(a => a.value === authorFilter)
    : null;

  const fetchFilterOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/checks/filters', {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch filter options");
      }

      const data = await response.json();
      setFilterOptions(data);
    } catch (err) {
      console.error("Failed to fetch filter options:", err);
      // Don't set error state - filters are optional
    }
  }, []);

  const fetchChecks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '20');
      if (authorFilter) params.set('author', authorFilter);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (repoFilter) params.set('repo', repoFilter);

      const response = await fetch(`/api/checks?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch checks");
      }

      const data = await response.json();
      setChecks(data.checks || []);
      setPagination(data.pagination || null);
    } catch (err: any) {
      setError(err.message || "Failed to load checks");
    } finally {
      setLoading(false);
    }
  }, [currentPage, authorFilter, environmentFilter, repoFilter]);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/dashboard/stats', {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data.statistics);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard statistics:", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchTimeline = useCallback(async () => {
    try {
      setLoadingTimeline(true);
      const response = await fetch('/api/dashboard/timeline', {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setTimelineChecks(data.checks || []);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard timeline:", err);
    } finally {
      setLoadingTimeline(false);
    }
  }, []);

  // Initial load: fetch stats, timeline, and filter options (only once on mount/status change)
  useEffect(() => {
    if (status === "authenticated") {
      fetchFilterOptions();
      fetchStatistics();
      fetchTimeline();
    } else if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Fetch checks when filters or page change
  useEffect(() => {
    if (status === "authenticated") {
      fetchChecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, currentPage, authorFilter, environmentFilter, repoFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && pagination && newPage <= pagination.totalPages) {
      const params = new URLSearchParams();
      params.set('page', newPage.toString());
      if (authorFilter) params.set('author', authorFilter);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (repoFilter) params.set('repo', repoFilter);
      router.push(`/dashboard?${params.toString()}`);
    }
  };

  const handleFilterChange = (filterType: 'author' | 'environment' | 'repo', value: string) => {
    const params = new URLSearchParams();
    params.set('page', '1'); // Reset to page 1 when filters change
    
    if (filterType === 'author') {
      if (value) params.set('author', value);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (repoFilter) params.set('repo', repoFilter);
    } else if (filterType === 'environment') {
      if (authorFilter) params.set('author', authorFilter);
      if (value) params.set('environment', value);
      if (repoFilter) params.set('repo', repoFilter);
    } else if (filterType === 'repo') {
      if (authorFilter) params.set('author', authorFilter);
      if (environmentFilter) params.set('environment', environmentFilter);
      if (value) params.set('repo', value);
    }
    
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleClearFilters = () => {
    router.push('/dashboard?page=1');
  };

  const hasActiveFilters = authorFilter || environmentFilter || repoFilter;

  const fetchSummary = useCallback(async (checkId: string) => {
    // Don't fetch if already loaded or currently loading
    if (summaries[checkId] || loadingSummaries.has(checkId)) {
      return;
    }

    setLoadingSummaries(prev => new Set(prev).add(checkId));

    try {
      const response = await fetch(`/api/checks/${checkId}/summary`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }

      const data = await response.json();
      setSummaries(prev => ({ ...prev, [checkId]: data }));
    } catch (err) {
      console.error("Failed to fetch check summary:", err);
      setSummaryErrors(prev => new Set(prev).add(checkId));
    } finally {
      setLoadingSummaries(prev => {
        const next = new Set(prev);
        next.delete(checkId);
        return next;
      });
    }
  }, [summaries, loadingSummaries]);

  // Bin checks by LOCAL date (user's timezone) - memoized
  // MUST be before early returns to maintain hook order
  const binnedByDate = useMemo(() => {
    if (!timelineChecks.length) return new Map<string, TimelineCheck[]>();
    
    const bins = new Map<string, TimelineCheck[]>();
    timelineChecks.forEach(check => {
      // Convert ISO timestamp to local date string (user's timezone)
      const localDate = new Date(check.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      
      if (!bins.has(localDate)) {
        bins.set(localDate, []);
      }
      bins.get(localDate)!.push(check);
    });
    
    return bins;
  }, [timelineChecks]);

  // Process binned data for charts based on groupBy type
  const chartData = useMemo(() => {
    if (binnedByDate.size === 0) return { data: [], keys: [] as string[] };

    // Get sorted dates
    const sortedDates = Array.from(binnedByDate.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    // Format dates for display
    const formatDate = (dateStr: string) => 
      new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (groupBy === 'outcome') {
      // Stacked bar by outcome
      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const compliant = checks.filter(c => c.outcome === 'compliant').length;
        const attention = checks.filter(c => c.outcome === 'attention').length;
        const notRelevant = checks.filter(c => c.outcome === 'not_relevant').length;
        
        return {
          date: formatDate(dateStr),
          Compliant: compliant,
          Attention: attention,
          'Not Relevant': notRelevant
        };
      });
      return { data, keys: ['Compliant', 'Attention', 'Not Relevant'] };
    } else if (groupBy === 'repo') {
      // Group by repository - stacked
      const repoSet = new Set<string>();
      
      // First pass: collect all repos
      binnedByDate.forEach(checks => {
        checks.forEach(check => {
          repoSet.add(check.repoName || 'Unknown');
        });
      });

      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const row: Record<string, string | number> = { date: formatDate(dateStr) };
        
        repoSet.forEach(repo => {
          row[repo] = checks.filter(c => (c.repoName || 'Unknown') === repo).length;
        });
        
        return row;
      });
      return { data, keys: Array.from(repoSet) };
    } else if (groupBy === 'environment') {
      // Group by environment - stacked
      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const github = checks.filter(c => c.environment === 'github').length;
        const gitlab = checks.filter(c => c.environment === 'gitlab').length;
        const vercel = checks.filter(c => c.environment === 'vercel').length;
        const local = checks.filter(c => c.environment === 'local').length;
        const other = checks.filter(c => c.environment && !['github', 'gitlab', 'vercel', 'local'].includes(c.environment)).length;
        
        return {
          date: formatDate(dateStr),
          GitHub: github,
          GitLab: gitlab,
          Vercel: vercel,
          Local: local,
          Other: other
        };
      });
      return { data, keys: ['GitHub', 'GitLab', 'Vercel', 'Local', 'Other'] };
    } else {
      // Group by threadline (human-readable name) - limit to top 10 most active, stacked
      const threadlineTotals = new Map<string, number>();
      
      // First pass: count total occurrences per threadline
      binnedByDate.forEach(checks => {
        checks.forEach(check => {
          check.threadlineIds.forEach(threadlineId => {
            threadlineTotals.set(threadlineId, (threadlineTotals.get(threadlineId) || 0) + 1);
          });
        });
      });

      // Get top 10 most active threadlines
      const topThreadlines = Array.from(threadlineTotals.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id);

      const data = sortedDates.map(dateStr => {
        const checks = binnedByDate.get(dateStr)!;
        const row: Record<string, string | number> = { date: formatDate(dateStr) };
        
        topThreadlines.forEach(threadlineId => {
          row[threadlineId] = checks.filter(c => c.threadlineIds.includes(threadlineId)).length;
        });
        
        return row;
      });
      return { data, keys: topThreadlines };
    }
  }, [binnedByDate, groupBy]);

  if (status === "loading" || loading) {
    return (
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  const formatRelativeTime = (dateString: string): { display: string; tooltip: string } => {
    // dateString is now ISO 8601 with 'Z' (UTC indicator) from API
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    
    // Precise tooltip with seconds
    const tooltip = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    
    // Relative time for recent items (< 2 hours)
    if (diffSeconds < 60) {
      return { display: `${diffSeconds} seconds ago`, tooltip };
    } else if (diffMinutes < 60) {
      return { display: `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`, tooltip };
    } else if (diffHours < 2) {
      return { display: `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`, tooltip };
    }
    
    // Absolute time for older items
    const display = date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    return { display, tooltip };
  };

  const formatDiffStats = (stats: Check["diffStats"]) => {
    if (stats.total === 0) return "No changes";
    return `${stats.added > 0 ? `+${stats.added}` : ""}${stats.removed > 0 ? `-${stats.removed}` : ""} lines`;
  };

  const formatResults = (results: Check["results"], threadlinesCount: number) => {
    const parts = [];
    if (results.compliant > 0) parts.push(`${results.compliant} compliant`);
    if (results.attention > 0) parts.push(`${results.attention} attention`);
    if (results.notRelevant > 0) parts.push(`${results.notRelevant} not relevant`);
    const resultsText = parts.join(", ") || "No results";
    return `${resultsText} (${threadlinesCount} threadline${threadlinesCount !== 1 ? 's' : ''})`;
  };

  const formatRepoName = (repoName: string | null): string => {
    if (!repoName) return "—";
    
    // If it's already in format "user/repo", return as-is
    if (!repoName.includes('://') && repoName.includes('/')) {
      return repoName;
    }
    
    // Try to parse GitHub/GitLab URLs
    try {
      const url = new URL(repoName);
      const pathParts = url.pathname.split('/').filter(Boolean);
      
      // Remove .git suffix if present
      const lastPart = pathParts[pathParts.length - 1];
      const repoPart = lastPart?.endsWith('.git') ? lastPart.slice(0, -4) : lastPart;
      
      if (pathParts.length >= 2) {
        return `${pathParts[pathParts.length - 2]}/${repoPart}`;
      }
      
      // Fallback: return last part without .git
      return repoPart || repoName;
    } catch {
      // If URL parsing fails, return as-is
      return repoName;
    }
  };

  const getEnvironmentBadge = (env: string | null) => {
    if (!env) return null;
    
    const colors: Record<string, string> = {
      vercel: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      github: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      gitlab: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      local: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    
    const color = colors[env] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${color}`}>
        {env}
      </span>
    );
  };

  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <h1 className="text-4xl font-medium mb-6 text-white">Threadline Checks</h1>

          {/* Statistics Panel */}
          {statistics && (
            <div className="mb-6">
              <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Total Checks */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">Total Checks</p>
                    <p className="text-2xl font-semibold text-white">{statistics.totalChecks.toLocaleString()}</p>
                  </div>

                  {/* Total Lines Reviewed */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">Lines Reviewed</p>
                    <p className="text-2xl font-semibold text-white">{statistics.totalLinesReviewed.toLocaleString()}</p>
                  </div>

                  {/* Violations Caught */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">Violations Caught</p>
                    <p className="text-2xl font-semibold text-yellow-400">{statistics.violationsCaught.toLocaleString()}</p>
                  </div>

                  {/* Unique Repos */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">Repositories</p>
                    <p className="text-2xl font-semibold text-white">{statistics.uniqueRepos}</p>
                  </div>

                  {/* Compliance Rate */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">Compliance Rate</p>
                    <p className="text-2xl font-semibold text-green-400">{statistics.complianceRate}%</p>
                  </div>

                  {/* Total Files Reviewed */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">Files Reviewed</p>
                    <p className="text-2xl font-semibold text-white">{statistics.totalFilesReviewed.toLocaleString()}</p>
                  </div>

                  {/* Checks This Week */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">This Week</p>
                    <p className="text-2xl font-semibold text-white">{statistics.checksThisWeek}</p>
                  </div>

                  {/* CI/CD vs Local */}
                  <div className="flex flex-col items-center text-center">
                    <p className="text-sm text-slate-400 mb-1">CI/CD vs Local</p>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-semibold text-purple-400">{statistics.cicdChecks} CI/CD</p>
                      <p className="text-sm font-semibold text-blue-400">{statistics.localChecks} Local</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Chart */}
          {timelineChecks.length > 0 && (
            <div className="mb-6">
              <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white">Check Activity (Last 90 Days)</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setGroupBy('outcome')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        groupBy === 'outcome'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      By Outcome
                    </button>
                    <button
                      onClick={() => setGroupBy('repo')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        groupBy === 'repo'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      By Repo
                    </button>
                    <button
                      onClick={() => setGroupBy('environment')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        groupBy === 'environment'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      By Environment
                    </button>
                    <button
                      onClick={() => setGroupBy('threadline')}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        groupBy === 'threadline'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      By Threadline
                    </button>
                  </div>
                </div>
                {loadingTimeline ? (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-slate-400">Loading chart...</p>
                  </div>
                ) : chartData.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis 
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #334155',
                          borderRadius: '8px',
                          color: '#e2e8f0'
                        }}
                      />
                      <Legend 
                        wrapperStyle={{ color: '#94a3b8' }}
                      />
                      {groupBy === 'outcome' ? (
                        <>
                          <Bar dataKey="Compliant" stackId="stack" fill="#22c55e" />
                          <Bar dataKey="Attention" stackId="stack" fill="#eab308" />
                          <Bar dataKey="Not Relevant" stackId="stack" fill="#64748b" />
                        </>
                      ) : groupBy === 'environment' ? (
                        <>
                          <Bar dataKey="GitHub" stackId="stack" fill="#64748b" />
                          <Bar dataKey="GitLab" stackId="stack" fill="#f97316" />
                          <Bar dataKey="Vercel" stackId="stack" fill="#a855f7" />
                          <Bar dataKey="Local" stackId="stack" fill="#3b82f6" />
                          <Bar dataKey="Other" stackId="stack" fill="#94a3b8" />
                        </>
                      ) : (
                        // For repo and threadline, dynamically create stacked bars
                        (() => {
                          const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f43f5e', '#14b8a6', '#a3e635'];
                          return chartData.keys.map((key, index) => (
                            <Bar 
                              key={key} 
                              dataKey={key} 
                              stackId="stack"
                              fill={colors[index % colors.length]}
                            />
                          ));
                        })()
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-64 flex items-center justify-center">
                    <p className="text-slate-400">No data available for the selected grouping</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filters */}
          {filterOptions && (
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 relative">
                <label htmlFor="author-filter" className="text-sm text-slate-400">Author:</label>
                <div className="relative">
                  <button
                    id="author-filter"
                    type="button"
                    onClick={() => setAuthorDropdownOpen(!authorDropdownOpen)}
                    className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50 min-w-[200px] text-left flex items-center justify-between"
                  >
                    {selectedAuthor ? (
                      <span className="truncate">
                        {selectedAuthor.value.split('|')[0] || selectedAuthor.value.split('|')[1]}
                      </span>
                    ) : (
                      <span>All Authors</span>
                    )}
                    <span className="ml-2 text-slate-500 flex-shrink-0">▼</span>
                  </button>
                  {authorDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setAuthorDropdownOpen(false)}
                      />
                      <div className="absolute z-20 mt-1 bg-slate-800 border border-slate-700 rounded shadow-lg max-h-60 overflow-auto min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => {
                            handleFilterChange('author', '');
                            setAuthorDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                            !authorFilter ? 'text-green-400' : 'text-slate-300'
                          }`}
                        >
                          All Authors
                        </button>
                        {filterOptions.authors.map((author) => {
                          const [name, email] = author.value.split('|');
                          const isSelected = authorFilter === author.value;
                          return (
                            <button
                              key={author.value}
                              type="button"
                              onClick={() => {
                                handleFilterChange('author', author.value);
                                setAuthorDropdownOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                                isSelected ? 'text-green-400 bg-slate-700/50' : 'text-slate-300'
                              }`}
                            >
                              {name && email ? (
                                <>
                                  <div>{name}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{email}</div>
                                </>
                              ) : name ? (
                                <div>{name}</div>
                              ) : (
                                <div>{email}</div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="environment-filter" className="text-sm text-slate-400">Environment:</label>
                <select
                  id="environment-filter"
                  value={environmentFilter}
                  onChange={(e) => handleFilterChange('environment', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
                >
                  <option value="">All Environments</option>
                  {filterOptions.environments.map((env) => (
                    <option key={env.value} value={env.value}>
                      {env.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="repo-filter" className="text-sm text-slate-400">Repository:</label>
                <select
                  id="repo-filter"
                  value={repoFilter}
                  onChange={(e) => handleFilterChange('repo', e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-green-500/50"
                >
                  <option value="">All Repositories</option>
                  {filterOptions.repositories.map((repo) => (
                    <option key={repo.value} value={repo.value}>
                      {repo.label}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {checks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-lg mb-2">No checks yet</p>
              <p className="text-slate-500 text-sm">
                Run <code className="bg-slate-800 px-2 py-1 rounded">threadlines check</code> to see your checks here
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Author</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Environment</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Branch</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Repository</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Changes</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">Results</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check) => (
                    <tr
                      key={check.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/check/${check.id}`)}
                    >
                      <td className="py-3 px-4">
                        {check.commitAuthorName ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-300 text-sm">{check.commitAuthorName}</span>
                            {check.commitAuthorEmail && (
                              <span className="text-slate-500 text-xs">{check.commitAuthorEmail}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getEnvironmentBadge(check.environment) || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300 font-mono">
                        {check.branchName || <span className="text-slate-500">—</span>}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-mono">
                        {check.repoName ? (
                          <span 
                            title={check.repoName}
                            className="cursor-help"
                          >
                            {formatRepoName(check.repoName)}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const { display, tooltip } = formatRelativeTime(check.createdAt);
                          return (
                            <Link 
                              href={`/check/${check.id}`} 
                              className="text-slate-300 text-sm hover:text-white transition-colors"
                              title={tooltip}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {display}
                            </Link>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4">
                        {(() => {
                          const tooltipParts: string[] = [];
                          tooltipParts.push(`${check.filesChangedCount} file${check.filesChangedCount !== 1 ? 's' : ''} changed`);
                          if (check.commitMessage) {
                            tooltipParts.push('');
                            tooltipParts.push(`Commit: ${check.commitMessage}`);
                          } else {
                            tooltipParts.push('');
                            tooltipParts.push('(No commit message - local changes)');
                          }
                          return (
                            <span 
                              title={tooltipParts.join('\n')}
                              className="text-slate-300 text-sm cursor-help"
                            >
                              {formatDiffStats(check.diffStats)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {(() => {
                          const summary = summaries[check.id];
                          const hasError = summaryErrors.has(check.id);
                          const buildTooltip = (): string => {
                            if (hasError) {
                              return 'Error retrieving check summary';
                            }

                            if (!summary) {
                              // Summary not loaded yet - show basic counts
                              const parts: string[] = [];
                              parts.push('Results Breakdown:');
                              parts.push('');
                              if (check.results.compliant > 0) {
                                parts.push(`✓ ${check.results.compliant} compliant`);
                              }
                              if (check.results.attention > 0) {
                                parts.push(`⚠ ${check.results.attention} attention`);
                              }
                              if (check.results.notRelevant > 0) {
                                parts.push(`— ${check.results.notRelevant} not relevant`);
                              }
                              parts.push('');
                              parts.push(`Total: ${check.threadlinesCount} threadline${check.threadlinesCount !== 1 ? 's' : ''}`);
                              return parts.join('\n');
                            }

                            // Full tooltip with threadline IDs
                            const parts: string[] = [];
                            parts.push('Results Breakdown:');
                            parts.push('');

                            if (summary.compliant.length > 0) {
                              parts.push(`✓ ${summary.compliant.length} compliant:`);
                              summary.compliant.forEach(id => {
                                parts.push(`  • ${id}`);
                              });
                              parts.push('');
                            }

                            if (summary.attention.length > 0) {
                              parts.push(`⚠ ${summary.attention.length} attention:`);
                              summary.attention.forEach(id => {
                                parts.push(`  • ${id}`);
                              });
                              parts.push('');
                            }

                            if (summary.notRelevant.length > 0) {
                              parts.push(`— ${summary.notRelevant.length} not relevant:`);
                              summary.notRelevant.forEach(id => {
                                parts.push(`  • ${id}`);
                              });
                              parts.push('');
                            }

                            parts.push(`Total: ${summary.total} threadline${summary.total !== 1 ? 's' : ''}`);
                            return parts.join('\n');
                          };

                          return (
                            <div 
                              className="flex flex-col gap-1 cursor-help"
                              title={buildTooltip()}
                              onMouseEnter={() => fetchSummary(check.id)}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                {check.results.compliant > 0 && (
                                  <span className="text-green-400">{check.results.compliant} ✓</span>
                                )}
                                {check.results.attention > 0 && (
                                  <span className="text-yellow-400">{check.results.attention} ⚠</span>
                                )}
                                {check.results.notRelevant > 0 && (
                                  <span className="text-slate-500">{check.results.notRelevant} —</span>
                                )}
                                {check.results.compliant === 0 && 
                                 check.results.attention === 0 && 
                                 check.results.notRelevant === 0 && (
                                  <span className="text-slate-500">—</span>
                                )}
                              </div>
                              <span className="text-slate-500 text-xs">
                                {check.threadlinesCount} threadline{check.threadlinesCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                itemName="check"
                onPageChange={handlePageChange}
              />
            )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen">
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
            <p className="text-slate-400">Loading...</p>
          </div>
        </section>
      </main>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}

