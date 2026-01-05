"use client";

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

interface StatisticsPanelProps {
  statistics: DashboardStatistics;
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  return (
    <div className="mb-6">
      <div className="bg-slate-950/50 p-6 rounded-lg border border-slate-800">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          {/* Row 1, Column 1: Total Checks */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Total Checks</p>
            <p className="text-2xl font-semibold text-white">{statistics.totalChecks.toLocaleString()}</p>
          </div>

          {/* Row 1, Column 2: Total Lines Reviewed */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Lines Reviewed</p>
            <p className="text-2xl font-semibold text-white">{statistics.totalLinesReviewed.toLocaleString()}</p>
          </div>

          {/* Row 1, Column 3: Violations Caught */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Violations Caught</p>
            <p className="text-2xl font-semibold text-yellow-400">{statistics.violationsCaught.toLocaleString()}</p>
          </div>

          {/* Row 1, Column 4: Open Issues */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Open Issues</p>
            <p className="text-2xl font-semibold text-yellow-400">{statistics.openIssues.toLocaleString()}</p>
          </div>

          {/* Row 1, Column 5: Unique Repos */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Repositories</p>
            <p className="text-2xl font-semibold text-white">{statistics.uniqueRepos}</p>
          </div>

          {/* Row 2, Column 1: Compliance Rate */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Compliance Rate</p>
            <p className="text-2xl font-semibold text-green-400">{statistics.complianceRate}%</p>
          </div>

          {/* Row 2, Column 2: Total Files Reviewed */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Files Reviewed</p>
            <p className="text-2xl font-semibold text-white">{statistics.totalFilesReviewed.toLocaleString()}</p>
          </div>

          {/* Row 2, Column 3: Checks This Week */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">This Week</p>
            <p className="text-2xl font-semibold text-white">{statistics.checksThisWeek}</p>
          </div>

          {/* Row 2, Column 4: Fixed Issues */}
          <div className="flex flex-col items-center text-center">
            <p className="text-sm text-slate-400 mb-1">Fixed Issues</p>
            <p className="text-2xl font-semibold text-blue-400">{statistics.fixedIssues.toLocaleString()}</p>
          </div>

          {/* Row 2, Column 5: CI/CD vs Local */}
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
  );
}

