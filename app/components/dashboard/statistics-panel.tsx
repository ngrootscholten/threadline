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
}

interface StatisticsPanelProps {
  statistics: DashboardStatistics;
}

export function StatisticsPanel({ statistics }: StatisticsPanelProps) {
  return (
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
  );
}

