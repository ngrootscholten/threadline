"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { TimelineChart } from "../components/dashboard/timeline-chart";
import { ChecksTable } from "../components/dashboard/checks-table";
import { ChecksFilters } from "../components/dashboard/checks-filters";
import { StatisticsPanel } from "../components/dashboard/statistics-panel";

interface ResultDetail {
  threadline_id: string;
  status: 'compliant' | 'attention' | 'not_relevant' | 'error';
  fixId: string | null;
}

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
  results: ResultDetail[];
  createdAt: string;
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
  openIssues: number;
  fixedIssues: number;
}

function DashboardPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checks, setChecks] = useState<Check[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [timelineChecks, setTimelineChecks] = useState<Array<{
    id: string;
    createdAt: string;
    outcome: string;
    repoName: string | null;
    environment: string | null;
    threadlineIds: string[];
  }>>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  // Local state for filters and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [authorFilter, setAuthorFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [repoFilter, setRepoFilter] = useState('');

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
      setCurrentPage(newPage);
    }
  };

  const handleFilterChange = (filterType: 'author' | 'environment' | 'repo', value: string) => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    
    if (filterType === 'author') {
      setAuthorFilter(value);
    } else if (filterType === 'environment') {
      setEnvironmentFilter(value);
    } else if (filterType === 'repo') {
      setRepoFilter(value);
    }
  };

  const handleClearFilters = () => {
    setCurrentPage(1);
    setAuthorFilter('');
    setEnvironmentFilter('');
    setRepoFilter('');
  };

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

  return (
    <main className="min-h-screen">
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 md:p-6">
          <h1 className="text-4xl font-medium mb-6 text-white">Threadline Checks</h1>

          {/* Statistics Panel */}
          {statistics && <StatisticsPanel statistics={statistics} />}

          {/* Timeline Chart */}
          <TimelineChart timelineChecks={timelineChecks} loading={loadingTimeline} />

          {/* Filters */}
          {filterOptions && (
            <ChecksFilters
              filterOptions={filterOptions}
              authorFilter={authorFilter}
              environmentFilter={environmentFilter}
              repoFilter={repoFilter}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
            />
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <ChecksTable 
            checks={checks} 
            pagination={pagination} 
            onPageChange={handlePageChange}
          />
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

